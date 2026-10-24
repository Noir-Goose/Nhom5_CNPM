import json
import os
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/owner/poi", tags=["POI Owner"])
TARGET_LANGUAGES = ("en", "zh", "ja", "ko")
TRANSLATION_URL = "https://translation.googleapis.com/language/translate/v2"


class VietnameseContent(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=3000)
    category: str = Field(min_length=1, max_length=100)

    @field_validator("name", "description", "category")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Vietnamese content cannot be blank")
        return value


class TranslationRequest(BaseModel):
    content: VietnameseContent


def translate_text(text: str, target: str, api_key: str) -> str:
    body = urlencode({"q": text, "source": "vi", "target": target, "format": "text"}).encode()
    request = Request(
        f"{TRANSLATION_URL}?{urlencode({'key': api_key})}",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=20) as response:
            result: dict[str, Any] = json.loads(response.read().decode("utf-8"))
        return result["data"]["translations"][0]["translatedText"]
    except (HTTPError, URLError, TimeoutError, KeyError, IndexError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Không thể dịch nội dung lúc này. Vui lòng thử lại.",
        ) from error


@router.post("/translate")
def translate_vietnamese_content(
    payload: TranslationRequest,
    _owner: dict[str, Any] = Depends(get_current_user),
):
    api_key = os.getenv("GOOGLE_TRANSLATE_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Backend chưa cấu hình GOOGLE_TRANSLATE_API_KEY.",
        )

    translated: dict[str, dict[str, str]] = {}
    for language in TARGET_LANGUAGES:
        translated[language] = {
            field: translate_text(getattr(payload.content, field), language, api_key)
            for field in ("name", "description", "category")
        }
    return {"content": {"vi": payload.content.model_dump(), **translated}}
