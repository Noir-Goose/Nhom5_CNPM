import json
import os
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/owner/poi", tags=["POI Owner"])
TARGET_LANGUAGES = {"en": "EN-US", "zh": "ZH", "ja": "JA", "ko": "KO"}
DEEPL_FREE_URL = "https://api-free.deepl.com/v2/translate"
DEEPL_PRO_URL = "https://api.deepl.com/v2/translate"


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


def translate_fields(texts: list[str], target: str, endpoint: str, api_key: str) -> list[str]:
    body = json.dumps({
        "text": texts,
        "source_lang": "VI",
        "target_lang": target,
    }).encode("utf-8")
    request = Request(
        endpoint,
        data=body,
        headers={
            "Authorization": f"DeepL-Auth-Key {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=20) as response:
            result: dict[str, Any] = json.loads(response.read().decode("utf-8"))
        return [translation["text"] for translation in result["translations"]]
    except (HTTPError, URLError, TimeoutError, KeyError, IndexError, TypeError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Không thể dịch nội dung bằng DeepL lúc này. Vui lòng thử lại.",
        ) from error


@router.post("/translate")
def translate_vietnamese_content(
    payload: TranslationRequest,
    _owner: dict[str, Any] = Depends(get_current_user),
):
    api_key = os.getenv("DEEPL_AUTH_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=503, detail="Backend chưa cấu hình DEEPL_AUTH_KEY.")

    # DeepL API Free keys end in :fx and use a separate API host.
    endpoint = DEEPL_FREE_URL if api_key.endswith(":fx") else DEEPL_PRO_URL
    fields = [payload.content.name, payload.content.description, payload.content.category]
    translated: dict[str, dict[str, str]] = {}
    for language, target_code in TARGET_LANGUAGES.items():
        translated_fields = translate_fields(fields, target_code, endpoint, api_key)
        translated[language] = {
            field: translated_fields[index]
            for index, field in enumerate(("name", "description", "category"))
        }

    return {"content": {"vi": payload.content.model_dump(), **translated}}
