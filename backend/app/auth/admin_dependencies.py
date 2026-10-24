
from typing import Any

from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from pymongo.database import Database

from app.auth.router import get_database
from app.auth.security import decode_access_token
from app.audit.service import record_audit_event

bearer_scheme = HTTPBearer()


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    database: Database = Depends(get_database),
) -> dict[str, Any]:
    """Authenticate the user and require the current Admin role."""
    try:
        payload = decode_access_token(credentials.credentials)
    except InvalidTokenError as error:
        record_audit_event(
            database, actor=None, action="admin.access_denied",
            resource_type="admin_endpoint", resource_id=None, outcome="denied",
            summary="Invalid or expired token was rejected at an Admin endpoint",
            reason_code="invalid_or_expired_token",
        )
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
        record_audit_event(
            database, actor=None, action="admin.access_denied",
            resource_type="admin_endpoint", resource_id=None, outcome="denied",
            summary="Admin endpoint rejected a token for a missing account",
            reason_code="account_not_found",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found",
        )

    if not user.get("emailVerified", False):
        record_audit_event(
            database, actor=user, action="admin.access_denied",
            resource_type="admin_endpoint", resource_id=None, outcome="denied",
            summary="Unverified account was denied Admin access",
            reason_code="email_not_verified",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email has not been verified",
        )

    if user.get("role") != "admin":
        record_audit_event(
            database, actor=user, action="admin.access_denied",
            resource_type="admin_endpoint", resource_id=None, outcome="denied",
            summary="Non-Admin account was denied Admin access",
            reason_code="admin_role_required",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return user
