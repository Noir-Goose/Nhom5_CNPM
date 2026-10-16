
from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database
from pymongo.errors import PyMongoError

from app.auth.dependencies import get_current_user
from app.auth.router import get_database

router = APIRouter(
    prefix="/api/v1/owner/notifications",
    tags=["Owner Notifications - UC9"],
)


def serialize_notification(
    notification: dict[str, Any],
) -> dict[str, Any]:
    result = dict(notification)
    result["id"] = str(result.pop("_id"))

    # Không gửi thông tin định danh nội bộ của chủ sở hữu ra frontend.
    result.pop("ownerId", None)

    for field in ("createdAt", "readAt"):
        value = result.get(field)
        if isinstance(value, datetime):
            result[field] = value.isoformat()

    return result


@router.get("")
def list_notifications(
    database: Database = Depends(get_database),
    owner: dict[str, Any] = Depends(get_current_user),
):
    """UC9: Lấy danh sách thông báo của POI Owner hiện tại."""
    try:
        notifications = list(
            database["notifications"]
            .find({"ownerId": owner["_id"]})
            .sort("createdAt", -1)
        )

        return [
            serialize_notification(item)
            for item in notifications
        ]

    except PyMongoError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not load notifications",
        ) from error


@router.get("/{notification_id}")
def get_notification(
    notification_id: str,
    database: Database = Depends(get_database),
    owner: dict[str, Any] = Depends(get_current_user),
):
    """UC9: Xem chi tiết và đánh dấu thông báo đã đọc."""
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid notification ID",
        )

    collection = database["notifications"]

    try:
        notification = collection.find_one(
            {
                "_id": ObjectId(notification_id),
                "ownerId": owner["_id"],
            }
        )

        if notification is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found",
            )

        if not notification.get("isRead", False):
            read_at = datetime.now(UTC)

            collection.update_one(
                {
                    "_id": notification["_id"],
                    "ownerId": owner["_id"],
                },
                {
                    "$set": {
                        "isRead": True,
                        "readAt": read_at,
                    }
                },
            )

            notification["isRead"] = True
            notification["readAt"] = read_at

        return serialize_notification(notification)

    except PyMongoError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not load notification details",
        ) from error
