
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


@router.post(
    "/submissions",
    status_code=status.HTTP_201_CREATED,
)
def submit_poi(
    payload: POISubmissionRequest,
    request: Request,
    owner: dict[str, Any] = Depends(get_current_user),
):
    database: Database | None = getattr(
        request.app.state, "database", None
    )

    if database is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not ready",
        )

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
        "status": submission["status"],
    }
