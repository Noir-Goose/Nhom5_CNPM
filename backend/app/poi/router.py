
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from pymongo.database import Database
from pymongo.errors import PyMongoError

from app.auth.dependencies import get_current_user


router = APIRouter(
    prefix="/api/v1/owner/poi",
    tags=["POI Owner"],
)

EDITABLE_STATUSES = {"fixRequest", "revision_requested"}


class POILanguageContent(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=3000)
    category: str = Field(min_length=1, max_length=100)

    @field_validator("name", "description", "category")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value


class POIMultilingualContent(BaseModel):
    vi: POILanguageContent
    en: POILanguageContent
    zh: POILanguageContent
    ja: POILanguageContent
    ko: POILanguageContent


class POISubmissionRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    categoryKey: str = Field(min_length=1, max_length=100)
    address: str = Field(min_length=1, max_length=500)
    description: str = Field(min_length=1, max_length=3000)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    content: POIMultilingualContent

    @field_validator("name", "categoryKey", "address", "description")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value


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


def serialize_datetime(value: Any) -> str | None:
    if isinstance(value, datetime):
        return value.isoformat()
    return None


def submission_response(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "submissionId": item.get("submissionId", ""),
        "poiId": item.get("poiId"),
        "name": item.get("name", ""),
        "categoryKey": item.get("categoryKey", ""),
        "address": item.get("address", ""),
        "description": item.get("description", ""),
        "latitude": item.get("latitude"),
        "longitude": item.get("longitude"),
        "content": item.get("content", {}),
        "status": item.get("status", "pending"),
        "adminMessage": item.get("adminMessage"),
        "createdAt": serialize_datetime(item.get("createdAt")),
        "updatedAt": serialize_datetime(item.get("updatedAt")),
        "reviewedAt": serialize_datetime(item.get("reviewedAt")),
    }


@router.post(
    "/submissions",
    status_code=status.HTTP_201_CREATED,
)
def submit_poi(
    payload: POISubmissionRequest,
    request: Request,
    owner: dict[str, Any] = Depends(get_current_user),
):
    """Gửi một POI mới để Admin xét duyệt."""
    database = get_database(request)
    now = datetime.now(UTC)

    submission = {
        "submissionId": str(uuid4()),
        "name": payload.name,
        "categoryKey": payload.categoryKey,
        "address": payload.address,
        "description": payload.description,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "content": payload.content.model_dump(),
        "createdBy": owner["_id"],
        "ownerEmail": owner.get("email", ""),
        "status": "pending",
        "adminMessage": None,
        "createdAt": now,
        "updatedAt": now,
    }

    try:
        database["poi_submissions"].insert_one(submission)
    except PyMongoError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not save POI submission",
        ) from error

    return {
        "message": "POI submission created successfully",
        "submissionId": submission["submissionId"],
        "status": "pending",
    }


@router.get("/submissions")
def get_my_submissions(
    request: Request,
    owner: dict[str, Any] = Depends(get_current_user),
):
    """Xem tất cả yêu cầu POI của Owner đang đăng nhập."""
    database = get_database(request)

    try:
        submissions = list(
            database["poi_submissions"]
            .find({"createdBy": owner["_id"]})
            .sort("createdAt", -1)
        )

        return [submission_response(item) for item in submissions]

    except PyMongoError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not load POI submissions",
        ) from error


@router.get("/submissions/{submission_id}")
def get_my_submission(
    submission_id: str,
    request: Request,
    owner: dict[str, Any] = Depends(get_current_user),
):
    """Xem chi tiết một yêu cầu thuộc về Owner đang đăng nhập."""
    database = get_database(request)

    try:
        submission = database["poi_submissions"].find_one({
            "submissionId": submission_id,
            "createdBy": owner["_id"],
        })

        if submission is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="POI submission not found",
            )

        return submission_response(submission)

    except HTTPException:
        raise
    except PyMongoError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not load POI submission",
        ) from error


@router.put("/submissions/{submission_id}")
def resubmit_poi(
    submission_id: str,
    payload: POISubmissionRequest,
    request: Request,
    owner: dict[str, Any] = Depends(get_current_user),
):
    """
    Chỉnh sửa và gửi lại yêu cầu chỉ khi Admin đã yêu cầu sửa.
    Sau khi gửi lại, trạng thái trở về pending.
    """
    database = get_database(request)
    submissions = database["poi_submissions"]
    now = datetime.now(UTC)

    try:
        submission = submissions.find_one({
            "submissionId": submission_id,
            "createdBy": owner["_id"],
        })

        if submission is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="POI submission not found",
            )

        if submission.get("status") not in EDITABLE_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Only POIs requiring revision can be edited",
            )

        update_result = submissions.update_one(
            {
                "_id": submission["_id"],
                "createdBy": owner["_id"],
                "status": submission["status"],
            },
            {
                "$set": {
                    "name": payload.name,
                    "categoryKey": payload.categoryKey,
                    "address": payload.address,
                    "description": payload.description,
                    "latitude": payload.latitude,
                    "longitude": payload.longitude,
                    "content": payload.content.model_dump(),
                    "status": "pending",
                    "adminMessage": None,
                    "reviewedAt": None,
                    "updatedAt": now,
                }
            },
        )

        if update_result.matched_count != 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Submission changed. Refresh and retry.",
            )

        return {
            "message": "POI updated and resubmitted successfully",
            "submissionId": submission_id,
            "status": "pending",
        }

    except HTTPException:
        raise
    except PyMongoError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not resubmit POI",
        ) from error