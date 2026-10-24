from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from pymongo.errors import PyMongoError


def record_audit_event(
    database,
    *,
    actor: dict[str, Any] | None,
    action: str,
    resource_type: str,
    resource_id: str | None,
    outcome: str,
    summary: str,
    reason_code: str | None = None,
    changes: dict[str, dict[str, Any]] | None = None,
) -> None:
    """Append a redacted event. Audit failure is operationally logged, not recursive."""
    allowed_actions = {
        "auth.login", "admin.access_denied", "user.create", "user.update", "user.status_change",
        "user.delete", "poi_submission.approve", "poi_submission.reject",
        "poi_submission.request_revision", "poi.update",
        "poi_owner_registration.approve", "poi_owner_registration.reject",
        "poi_owner_registration.delete",
    }
    allowed_outcomes = {"success", "failure", "denied"}
    if action not in allowed_actions or outcome not in allowed_outcomes:
        raise ValueError("Unsupported audit action or outcome")

    safe_changes: dict[str, dict[str, Any]] = {}
    for field, values in (changes or {}).items():
        if field not in {"fullName", "email", "role", "isActive", "approvalStatus", "status", "name", "categoryKey", "address", "latitude", "longitude"}:
            continue
        if not isinstance(values, dict) or set(values) - {"before", "after"}:
            continue
        safe_changes[field] = {
            key: value if isinstance(value, (str, int, float, bool)) or value is None else str(value)
            for key, value in values.items()
        }

    event = {
        "eventId": str(uuid4()),
        "occurredAt": datetime.now(UTC),
        "actorId": str(actor["_id"]) if actor and actor.get("_id") else None,
        "actorRole": actor.get("role", "anonymous") if actor else "anonymous",
        "actorEmail": str(actor.get("email", "")).strip().lower() or None if actor else None,
        "action": action,
        "resourceType": resource_type,
        "resourceId": str(resource_id)[:200] if resource_id is not None else None,
        "outcome": outcome,
        "summary": summary[:300],
        "reasonCode": reason_code[:80] if reason_code else None,
        "changes": safe_changes,
    }
    try:
        database["audit_logs"].insert_one(event)
    except (PyMongoError, ValueError, TypeError) as error:
        print(f"AUDIT_WRITE_FAILED action={action} resource={resource_type}: {error}")


def ensure_audit_indexes(database) -> None:
    """Create the audit query indexes once during application startup."""
    logs = database["audit_logs"]
    logs.create_index("eventId", unique=True)
    logs.create_index([("occurredAt", -1)])
    logs.create_index([("actorId", 1), ("occurredAt", -1)])
    logs.create_index([("action", 1), ("occurredAt", -1)])
    logs.create_index([("resourceType", 1), ("resourceId", 1), ("occurredAt", -1)])
    logs.create_index([("outcome", 1), ("occurredAt", -1)])


def serialize_audit_event(event: dict[str, Any]) -> dict[str, Any]:
    occurred_at = event.get("occurredAt")
    return {
        "eventId": event.get("eventId", str(event.get("_id", ""))),
        "occurredAt": occurred_at.isoformat() if isinstance(occurred_at, datetime) else None,
        "actorId": event.get("actorId"),
        "actorRole": event.get("actorRole", "system"),
        "actorEmail": event.get("actorEmail"),
        "action": event.get("action"),
        "resourceType": event.get("resourceType"),
        "resourceId": event.get("resourceId"),
        "outcome": event.get("outcome"),
        "summary": event.get("summary"),
        "reasonCode": event.get("reasonCode"),
        "changes": event.get("changes", {}),
    }
