from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from pymongo.errors import PyMongoError

from app.auth.admin_dependencies import get_current_admin

router = APIRouter(tags=["Tour analytics"])


class TourEventRequest(BaseModel):
    # [TOUR-AN-001] Chỉ nhận loại sự kiện, POI và ngôn ngữ; không nhận dữ liệu định danh.
    eventType: Literal["started", "completed"]
    poiId: str = Field(min_length=1, max_length=100)
    language: Literal["vi", "en", "zh", "ja", "ko"]
    durationSeconds: int | None = Field(default=None, ge=0, le=7200)


@router.post("/api/v1/analytics/visits", status_code=status.HTTP_202_ACCEPTED)
def record_page_visit(request: Request):
    """Record one anonymous public-site visit; the client limits this to once per tab session."""
    database = getattr(request.app.state, "database", None)
    if database is None:
        raise HTTPException(status_code=503, detail="Database is not ready")
    try:
        database["tour_analytics"].insert_one({
            "eventType": "visit",
            "createdAt": datetime.now(UTC),
        })
        return {"accepted": True}
    except PyMongoError as error:
        raise HTTPException(status_code=503, detail="Could not save visit") from error


@router.post("/api/v1/analytics/tour-events", status_code=status.HTTP_202_ACCEPTED)
def record_tour_event(payload: TourEventRequest, request: Request):
    """Store an anonymous play-start or play-complete event for a known POI."""
    database = getattr(request.app.state, "database", None)
    if database is None:
        raise HTTPException(status_code=503, detail="Database is not ready")

    if payload.eventType == "completed" and payload.durationSeconds is None:
        raise HTTPException(status_code=422, detail="durationSeconds is required for completed events")

    try:
        exists = database["pois"].find_one({"id": payload.poiId}, {"_id": 1})
        if exists is None:
            raise HTTPException(status_code=404, detail="POI not found")

        event: dict[str, Any] = {
            "eventType": payload.eventType,
            "poiId": payload.poiId,
            "language": payload.language,
            "createdAt": datetime.now(UTC),
        }
        if payload.durationSeconds is not None:
            event["durationSeconds"] = payload.durationSeconds

        database["tour_analytics"].insert_one(event)
        return {"accepted": True}
    except HTTPException:
        raise
    except PyMongoError as error:
        raise HTTPException(status_code=503, detail="Could not save tour event") from error


@router.get("/api/v1/admin/analytics/tour")
def get_tour_analytics(
    request: Request,
    days: int = Query(default=30, ge=7, le=90),
    admin: dict[str, Any] = Depends(get_current_admin),
):
    """[TOUR-AN-002] Return aggregated tour metrics to authenticated admins."""
    database = getattr(request.app.state, "database", None)
    if database is None:
        raise HTTPException(status_code=503, detail="Database is not ready")

    start_date = datetime.now(UTC) - timedelta(days=days)
    match = {"createdAt": {"$gte": start_date}}
    events = database["tour_analytics"]

    try:
        summary_rows = list(events.aggregate([
            {"$match": match},
            {"$group": {
                "_id": "$eventType",
                "count": {"$sum": 1},
                "duration": {"$sum": {"$ifNull": ["$durationSeconds", 0]}},
            }},
        ]))
        summary = {row["_id"]: row for row in summary_rows}
        starts = summary.get("started", {}).get("count", 0)
        completions = summary.get("completed", {}).get("count", 0)
        visits = summary.get("visit", {}).get("count", 0)

        top_poi_rows = list(events.aggregate([
            {"$match": {**match, "eventType": "started"}},
            {"$group": {"_id": "$poiId", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5},
        ]))
        top_poi_ids = [row["_id"] for row in top_poi_rows]
        poi_names = {
            poi.get("id"): poi.get("content", {}).get("vi", {}).get("name")
            or poi.get("name")
            or poi.get("id")
            for poi in database["pois"].find(
                {"id": {"$in": top_poi_ids}},
                {"_id": 0, "id": 1, "name": 1, "content.vi.name": 1},
            )
        }

        language_rows = list(events.aggregate([
            {"$match": {**match, "eventType": "started"}},
            {"$group": {"_id": "$language", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]))
        daily_rows = list(events.aggregate([
            {"$match": {**match, "eventType": {"$in": ["started", "completed", "visit"]}}},
            {"$group": {
                "_id": {
                    "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt", "timezone": "UTC"}},
                    "eventType": "$eventType",
                },
                "count": {"$sum": 1},
            }},
            {"$sort": {"_id.date": 1}},
        ]))
    except PyMongoError as error:
        raise HTTPException(status_code=503, detail="Could not load tour analytics") from error

    daily: dict[str, dict[str, Any]] = {}
    for row in daily_rows:
        date = row["_id"]["date"]
        daily.setdefault(date, {"date": date, "starts": 0, "completions": 0, "visits": 0})
        event_type = row["_id"]["eventType"]
        key = {"started": "starts", "completed": "completions", "visit": "visits"}[event_type]
        daily[date][key] = row["count"]

    total_duration = summary.get("completed", {}).get("duration", 0)
    return {
        "days": days,
        "summary": {
            "starts": starts,
            "completions": completions,
            "visits": visits,
            "completionRate": round(completions / starts * 100, 1) if starts else 0,
            "averageDurationSeconds": round(total_duration / completions) if completions else 0,
        },
        "topPois": [
            {"poiId": row["_id"], "name": poi_names.get(row["_id"], row["_id"]), "count": row["count"]}
            for row in top_poi_rows
        ],
        "languages": [
            {"language": row["_id"], "count": row["count"]}
            for row in language_rows
        ],
        "daily": list(daily.values()),
    }
