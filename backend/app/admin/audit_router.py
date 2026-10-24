import re
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pymongo.errors import PyMongoError

from app.audit.service import serialize_audit_event
from app.auth.admin_dependencies import get_current_admin

router = APIRouter(prefix="/api/v1/admin/audit-logs", tags=["Admin - Audit Log"])


def get_database(request: Request):
    database = getattr(request.app.state, "database", None)
    if database is None:
        raise HTTPException(status_code=503, detail="Database is not ready")
    return database


def build_filters(
    *, from_time: datetime | None, to_time: datetime | None,
    actor_id: str | None, action: str | None, resource_type: str | None,
    resource_id: str | None, outcome: str | None, query: str | None,
) -> dict[str, Any]:
    if from_time and to_time and from_time > to_time:
        raise HTTPException(status_code=422, detail="from must be earlier than or equal to to")
    filters: dict[str, Any] = {}
    if from_time or to_time:
        filters["occurredAt"] = {
            **({"$gte": from_time} if from_time else {}),
            **({"$lte": to_time} if to_time else {}),
        }
    for key, value in (("actorId", actor_id), ("action", action), ("resourceType", resource_type), ("resourceId", resource_id), ("outcome", outcome)):
        if value:
            filters[key] = value
    if outcome and outcome not in {"success", "failure", "denied"}:
        raise HTTPException(status_code=422, detail="Invalid outcome")
    if query:
        term = re.escape(query.strip())
        if term:
            filters["$or"] = [
                {"summary": {"$regex": term, "$options": "i"}},
                {"actorEmail": {"$regex": term, "$options": "i"}},
                {"resourceId": {"$regex": term, "$options": "i"}},
                {"action": {"$regex": term, "$options": "i"}},
            ]
    return filters


@router.get("")
def list_audit_logs(
    request: Request,
    from_time: datetime | None = Query(default=None, alias="from"),
    to_time: datetime | None = Query(default=None, alias="to"),
    actor_id: str | None = Query(default=None, alias="actorId", max_length=100),
    action: str | None = Query(default=None, max_length=100),
    resource_type: str | None = Query(default=None, alias="resourceType", max_length=80),
    resource_id: str | None = Query(default=None, alias="resourceId", max_length=200),
    outcome: str | None = Query(default=None, max_length=20),
    q: str | None = Query(default=None, max_length=100),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, alias="pageSize", ge=1, le=100),
    database=Depends(get_database),
    admin: dict[str, Any] = Depends(get_current_admin),
):
    filters = build_filters(
        from_time=from_time, to_time=to_time, actor_id=actor_id, action=action,
        resource_type=resource_type, resource_id=resource_id, outcome=outcome, query=q,
    )
    try:
        collection = database["audit_logs"]
        total = collection.count_documents(filters)
        cursor = collection.find(filters, {"_id": 0}).sort("occurredAt", -1).skip((page - 1) * page_size).limit(page_size)
        items = [serialize_audit_event(item) for item in cursor]
        return {"items": items, "page": page, "pageSize": page_size, "total": total, "hasNext": page * page_size < total}
    except PyMongoError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Could not load audit logs") from error


@router.get("/{event_id}")
def get_audit_event(
    event_id: str,
    database=Depends(get_database),
    admin: dict[str, Any] = Depends(get_current_admin),
):
    try:
        event = database["audit_logs"].find_one({"eventId": event_id}, {"_id": 0})
    except PyMongoError as error:
        raise HTTPException(status_code=503, detail="Could not load audit event") from error
    if event is None:
        raise HTTPException(status_code=404, detail="Audit event not found")
    return serialize_audit_event(event)
