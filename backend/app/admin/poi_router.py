
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field, field_validator
from pymongo.database import Database
from pymongo.errors import PyMongoError

from app.auth.admin_dependencies import get_current_admin

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Admin POI - UC11"],
)


def get_database(request: Request) -> Database:
    database: Database | None = getattr(
        request.app.state, "database", None
    )
    if database is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not ready",
        )
    return database


def serialize_document(document: dict[str, Any]) -> dict[str, Any]:
    result = dict(document)
    result.pop("_id", None)

    if isinstance(result.get("createdBy"), ObjectId):
        result["createdBy"] = str(result["createdBy"])

    for key in ("createdAt", "updatedAt", "reviewedAt"):
        if isinstance(result.get(key), datetime):
            result[key] = result[key].isoformat()

    return result


class AdminPoiUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    categoryKey: str = Field(min_length=1, max_length=100)
    address: str = Field(min_length=1, max_length=500)
    description: str = Field(default="", max_length=3000)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    content: dict[str, Any] = Field(default_factory=dict)

    @field_validator("name", "categoryKey", "address", "description")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value


class AdminPoiMessage(BaseModel):
    message: str = Field(min_length=1, max_length=2000)

    @field_validator("message")
    @classmethod
    def reject_blank_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message cannot be blank")
        return value


@router.get("/poi-submissions")
def list_poi_submissions(
    request: Request,
    status_filter: str = Query(
        default="pending",
        alias="status",
        pattern="^(pending|approved|reject|rejected|fixRequest|revision_requested)$",
    ),
    admin: dict[str, Any] = Depends(get_current_admin),
):
    """UC11: Danh sách POI Owner gửi theo trạng thái."""
    database = get_database(request)

    # Hỗ trợ cả trạng thái mới và dữ liệu cũ trong MongoDB.
    status_aliases = {
        "reject": ["reject", "rejected"],
        "rejected": ["reject", "rejected"],
        "fixRequest": ["fixRequest", "revision_requested"],
        "revision_requested": ["fixRequest", "revision_requested"],
    }
    statuses = status_aliases.get(status_filter, [status_filter])

    try:
        documents = list(
            database["poi_submissions"]
            .find({"status": {"$in": statuses}})
            .sort("createdAt", -1)
        )
        return [serialize_document(item) for item in documents]
    except PyMongoError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not load POI submissions",
        ) from error


@router.patch("/poi-submissions/{submission_id}/approve")
def approve_poi_submission(
    submission_id: str,
    request: Request,
    admin: dict[str, Any] = Depends(get_current_admin),
):
    """UC11: Duyệt POI mới hoặc duyệt lại POI đã được chỉnh sửa."""
    database = get_database(request)
    submissions = database["poi_submissions"]
    pois = database["pois"]
    inserted_id = None

    try:
        submission = submissions.find_one({
            "submissionId": submission_id,
            "status": "pending",
        })

        if submission is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pending POI submission not found",
            )

        now = datetime.now(UTC)
        existing_poi_id = submission.get("poiId")

        poi_data = {
            "name": submission.get("name", ""),
            "categoryKey": submission.get("categoryKey", ""),
            "address": submission.get("address", ""),
            "description": submission.get("description", ""),
            "latitude": submission.get("latitude"),
            "longitude": submission.get("longitude"),
            "content": submission.get("content", {}),
            "isActive": True,
            "approvalStatus": "approved",
            "revisionStatus": None,
            "updatedAt": now,
        }

        if existing_poi_id:
            # POI đã tồn tại: cập nhật bản ghi cũ, không tạo bản ghi mới.
            result = pois.update_one(
                {"id": existing_poi_id},
                {"$set": poi_data},
            )

            if result.matched_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Existing POI not found",
                )

            poi_id = existing_poi_id

        else:
            # POI lần đầu được duyệt: tạo bản ghi mới.
            poi_id = f"poi-{uuid4().hex}"

            poi = {
                "id": poi_id,
                "submissionId": submission_id,
                "ownerId": str(submission["createdBy"]),
                "createdAt": now,
                **poi_data,
            }

            inserted = pois.insert_one(poi)
            inserted_id = inserted.inserted_id

        result = submissions.update_one(
            {
                "_id": submission["_id"],
                "status": "pending",
            },
            {
                "$set": {
                    "status": "approved",
                    "poiId": poi_id,
                    "adminMessage": "POI đã được duyệt.",
                    "reviewedAt": now,
                    "updatedAt": now,
                }
            },
        )

        if result.modified_count != 1:
            if inserted_id is not None:
                pois.delete_one({"_id": inserted_id})

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Submission status changed. Refresh and retry.",
            )

        return {
            "message": "POI approved",
            "submissionId": submission_id,
            "poiId": poi_id,
            "status": "approved",
        }

    except HTTPException:
        raise
    except PyMongoError as error:
        if inserted_id is not None:
            try:
                pois.delete_one({"_id": inserted_id})
            except PyMongoError:
                pass

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not approve POI submission",
        ) from error


@router.patch("/poi-submissions/{submission_id}/reject")
def reject_poi_submission(
    submission_id: str,
    payload: AdminPoiMessage,
    request: Request,
    admin: dict[str, Any] = Depends(get_current_admin),
):
    """UC11: Từ chối POI và lưu lời nhắn cho POI Owner."""
    database = get_database(request)
    now = datetime.now(UTC)

    try:
        result = database["poi_submissions"].update_one(
            {
                "submissionId": submission_id,
                "status": "pending",
            },
            {
                "$set": {
                    "status": "reject",
                    "adminMessage": payload.message,
                    "reviewedAt": now,
                    "updatedAt": now,
                }
            },
        )

        if result.modified_count != 1:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pending POI submission not found",
            )

        return {
            "message": "POI rejected",
            "submissionId": submission_id,
            "status": "reject",
        }

    except HTTPException:
        raise
    except PyMongoError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not reject POI submission",
        ) from error


@router.get("/pois")
def list_system_pois(
    request: Request,
    admin: dict[str, Any] = Depends(get_current_admin),
):
    """UC11: Danh sách POI hiện có trong hệ thống."""
    database = get_database(request)

    try:
        documents = list(database["pois"].find({}).sort("name", 1))
        return [serialize_document(item) for item in documents]
    except PyMongoError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not load system POIs",
        ) from error


@router.patch("/pois/{poi_id}")
def update_system_poi(
    poi_id: str,
    payload: AdminPoiUpdateRequest,
    request: Request,
    admin: dict[str, Any] = Depends(get_current_admin),
):
    """UC11: Admin chỉnh sửa trực tiếp POI."""
    database = get_database(request)

    try:
        result = database["pois"].update_one(
            {"id": poi_id},
            {
                "$set": {
                    **payload.model_dump(),
                    "updatedAt": datetime.now(UTC),
                }
            },
        )

        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="POI not found",
            )

        return {"message": "POI updated", "poiId": poi_id}

    except HTTPException:
        raise
    except PyMongoError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not update POI",
        ) from error


@router.post("/pois/{poi_id}/request-revision")
def request_poi_revision(
    poi_id: str,
    payload: AdminPoiMessage,
    request: Request,
    admin: dict[str, Any] = Depends(get_current_admin),
):
    """UC11: Yêu cầu POI Owner chỉnh sửa POI."""
    database = get_database(request)

    try:
        poi = database["pois"].find_one({"id": poi_id})

        if poi is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="POI not found",
            )

        owner_id = poi.get("ownerId")
        submission_id = poi.get("submissionId")

        if (
            not owner_id
            or not submission_id
            or not ObjectId.is_valid(owner_id)
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This POI has no valid owner submission link",
            )

        now = datetime.now(UTC)

        result = database["poi_submissions"].update_one(
            {
                "submissionId": submission_id,
                "createdBy": ObjectId(owner_id),
                "status": "approved",
            },
            {
                "$set": {
                    "status": "fixRequest",
                    "adminMessage": payload.message,
                    "reviewedAt": now,
                    "updatedAt": now,
                }
            },
        )

        if result.modified_count != 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No linked approved submission was found",
            )

        database["pois"].update_one(
            {"id": poi_id},
            {
                "$set": {
                    "revisionStatus": "fixRequest",
                    "updatedAt": now,
                }
            },
        )

        return {
            "message": "Revision requested",
            "poiId": poi_id,
            "status": "fixRequest",
        }

    except HTTPException:
        raise
    except PyMongoError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not request POI revision",
        ) from error
