from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pymongo.database import Database
from pymongo.errors import PyMongoError

from app.auth.admin_dependencies import get_current_admin

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Admin"],
)


def get_database_from_request(request: Request) -> Database:
    """Return the database initialized during application startup."""
    database: Database | None = getattr(
        request.app.state,
        "database",
        None,
    )

    if database is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not ready",
        )

    return database



@router.get("/poi-owner-registrations")
def list_poi_owner_registrations(
    request: Request,
    status_filter: str = Query(
        default="pending",
        alias="status",
        pattern="^(pending|rejected)$",
    ),
    admin: dict[str, Any] = Depends(get_current_admin),
):
    """List verified POI Owner registrations by status."""
    database = get_database_from_request(request)

    try:
        users = list(
            database["users"]
            .find(
                {
                    "role": "poi_owner",
                    "emailVerified": True,
                    "approvalStatus": status_filter,
                },
                {
                    "_id": 1,
                    "fullName": 1,
                    "email": 1,
                    "approvalStatus": 1,
                    "createdAt": 1,
                },
            )
            .sort("createdAt", -1)
        )

        return [
            {
                "id": str(user["_id"]),
                "fullName": user.get("fullName", ""),
                "email": user.get("email", ""),
                "approvalStatus": user.get(
                    "approvalStatus",
                    status_filter,
                ),
                "createdAt": (
                    user["createdAt"].isoformat()
                    if user.get("createdAt")
                    else None
                ),
            }
            for user in users
        ]

    except PyMongoError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not load POI Owner registrations",
        ) from error

def update_registration_status(
    database: Database,
    user_id: str,
    new_status: str,
) -> dict[str, str]:
    """Update a POI Owner registration status."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID",
        )

    if new_status not in {"approved", "rejected"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid registration status",
        )

    try:
        user_filter = {
            "_id": ObjectId(user_id),
            "role": "poi_owner",
            "emailVerified": True,
        }

        user = database["users"].find_one(
            user_filter,
            {"approvalStatus": 1},
        )

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Verified POI Owner account not found",
            )

        current_status = user.get("approvalStatus")

        # If the account already has the requested status,
        # return success without changing the database.
        if current_status == new_status:
            return {
                "message": f"Account is already {new_status}",
                "userId": user_id,
                "approvalStatus": new_status,
            }

        # Allow approval from pending or rejected.
        if new_status == "approved":
            allowed_statuses = ["pending", "rejected"]
        else:
            # Allow rejection from pending or approved.
            allowed_statuses = ["pending", "approved"]

        if current_status not in allowed_statuses:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Cannot change status from "
                    f"{current_status} to {new_status}"
                ),
            )

        result = database["users"].update_one(
            {
                **user_filter,
                "approvalStatus": current_status,
            },
            {
                "$set": {
                    "approvalStatus": new_status,
                    "updatedAt": datetime.now(UTC),
                },
            },
        )

        if result.modified_count == 1:
            return {
                "message": f"POI Owner registration {new_status}",
                "userId": user_id,
                "approvalStatus": new_status,
            }

        # Check whether another request already made this change.
        latest_user = database["users"].find_one(
            user_filter,
            {"approvalStatus": 1},
        )

        if (
            latest_user is not None
            and latest_user.get("approvalStatus") == new_status
        ):
            return {
                "message": f"Account is already {new_status}",
                "userId": user_id,
                "approvalStatus": new_status,
            }

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Account status changed. Refresh and try again.",
        )

    except PyMongoError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not update POI Owner registration",
        ) from error
    

@router.patch("/poi-owner-registrations/{user_id}/approve")
def approve_poi_owner_registration(
    user_id: str,
    request: Request,
    admin: dict[str, Any] = Depends(get_current_admin),
):
    """Approve a pending POI Owner account."""
    database = get_database_from_request(request)

    return update_registration_status(
        database,
        user_id,
        "approved",
    )


@router.patch("/poi-owner-registrations/{user_id}/reject")
def reject_poi_owner_registration(
    user_id: str,
    request: Request,
    admin: dict[str, Any] = Depends(get_current_admin),
):
    """Reject a POI Owner account without deleting it."""
    database = get_database_from_request(request)

    return update_registration_status(
        database,
        user_id,
        "rejected",
    )

@router.delete("/poi-owner-registrations/{user_id}")
def delete_rejected_poi_owner_registration(
    user_id: str,
    request: Request,
    admin: dict[str, Any] = Depends(get_current_admin),
):
    """Delete a rejected POI Owner registration."""
    database = get_database_from_request(request)

    if not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID",
        )

    try:
        result = database["users"].delete_one({
            "_id": ObjectId(user_id),
            "role": "poi_owner",
            "emailVerified": True,
            "approvalStatus": "rejected",
        })

        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Rejected POI Owner registration not found",
            )

        return {
            "message": "Rejected POI Owner registration deleted",
            "userId": user_id,
        }

    except PyMongoError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not delete POI Owner registration",
        ) from error