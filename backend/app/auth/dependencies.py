
from typing import Any

from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from pymongo.database import Database

from app.auth.router import get_database
from app.auth.security import decode_access_token

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    database: Database = Depends(get_database),
) -> dict[str, Any]:
    try:
        payload = decode_access_token(credentials.credentials)
    except InvalidTokenError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured",
        ) from error

    user_id = payload.get("sub")
    if not isinstance(user_id, str) or not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token subject",
        )

    user = database["users"].find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found",
        )

    if user.get("role") != "admin" and user.get("isActive", True) is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.",
        )

    if not user.get("emailVerified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email has not been verified",
        )

    if user.get("role") != "poi_owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only POI Owners can submit POI requests",
        )

    if user.get("approvalStatus") != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="POI Owner account is not approved",
        )

    return user
