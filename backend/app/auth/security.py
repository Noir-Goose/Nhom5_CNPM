import os
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from dotenv import load_dotenv
from pwdlib import PasswordHash

BACKEND_DIR = __import__("pathlib").Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")

password_hasher = PasswordHash.recommended()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "").strip()
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256").strip()
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))


def hash_password(password: str) -> str:
    """Hash a password before storing it in the database."""
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Check a password against its stored hash."""
    return password_hasher.verify(password, password_hash)


def create_access_token(
    user_id: str,
    role: str,
    expires_minutes: int | None = None,
) -> str:
    """Create a signed JWT for an authenticated user."""
    if not JWT_SECRET_KEY:
        raise RuntimeError("JWT_SECRET_KEY is not configured in backend/.env")

    duration = (
        JWT_EXPIRE_MINUTES
        if expires_minutes is None
        else expires_minutes
    )

    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": user_id,
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=duration),
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict[str, Any]:
    """Validate a JWT and return its claims."""
    if not JWT_SECRET_KEY:
        raise RuntimeError("JWT_SECRET_KEY is not configured in backend/.env")

    return jwt.decode(
        token,
        JWT_SECRET_KEY,
        algorithms=[JWT_ALGORITHM],
    )