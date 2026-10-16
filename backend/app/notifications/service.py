
from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from pymongo.database import Database


def create_owner_notification(
    database: Database,
    *,
    owner_id: ObjectId | str,
    event_type: str,
    title: str,
    message: str,
    poi_id: str | None = None,
    submission_id: str | None = None,
) -> str:
    """Create a notification for the POI Owner who owns the affected POI."""

    if isinstance(owner_id, str):
        if not ObjectId.is_valid(owner_id):
            raise ValueError("Invalid POI Owner ID")
        owner_object_id = ObjectId(owner_id)
    else:
        owner_object_id = owner_id

    notification: dict[str, Any] = {
        "ownerId": owner_object_id,
        "type": event_type,
        "title": title,
        "message": message,
        "isRead": False,
        "createdAt": datetime.now(UTC),
        "readAt": None,
    }

    if poi_id is not None:
        notification["poiId"] = poi_id

    if submission_id is not None:
        notification["submissionId"] = submission_id

    result = database["notifications"].insert_one(notification)
    return str(result.inserted_id)
