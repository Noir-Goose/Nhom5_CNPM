import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from dotenv import load_dotenv
from pymongo import ASCENDING
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from app.auth.email_service import send_otp_email
from app.auth.schemas import OwnerRegistrationRequest, VerifyOtpRequest
from app.auth.security import hash_password

BACKEND_DIR = __import__("pathlib").Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")

OTP_SECRET = os.getenv("JWT_SECRET_KEY", "").strip()

OTP_TTL_MINUTES = 10
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_COOLDOWN_SECONDS = 60


def _hash_otp(email: str, otp: str) -> str:
    """Hash an OTP using a server-side secret."""
    if not OTP_SECRET:
        raise RuntimeError("JWT_SECRET_KEY is not configured")

    message = f"{email.lower()}:{otp}".encode("utf-8")
    return hmac.new(
        OTP_SECRET.encode("utf-8"),
        message,
        hashlib.sha256,
    ).hexdigest()


def _ensure_indexes(database: Database) -> None:
    """Create indexes needed by registration."""
    database["users"].create_index(
        [("email", ASCENDING)],
        unique=True,
    )
    database["email_verifications"].create_index(
        [("email", ASCENDING)],
        unique=True,
    )


def start_registration(
    database: Database,
    request: OwnerRegistrationRequest,
) -> dict[str, str]:
    """Create a pending email verification and send its OTP."""
    _ensure_indexes(database)

    email = str(request.email).strip().lower()
    users = database["users"]
    verifications = database["email_verifications"]

    if users.find_one({"email": email}, {"_id": 1}):
        raise ValueError("This email is already registered")

    existing = verifications.find_one({"email": email})

    now = datetime.now(timezone.utc)

    if existing:
        last_sent = existing.get("lastSentAt")
        if last_sent and (now - last_sent).total_seconds() < OTP_RESEND_COOLDOWN_SECONDS:
            raise ValueError("Please wait before requesting another OTP")

    otp = f"{secrets.randbelow(1_000_000):06d}"

    record = {
        "email": email,
        "fullName": request.full_name,
        "passwordHash": hash_password(request.password),
        "otpHash": _hash_otp(email, otp),
        "createdAt": now,
        "lastSentAt": now,
        "expiresAt": now + timedelta(minutes=OTP_TTL_MINUTES),
        "attempts": 0,
        "resendCount": 0,
        "used": False,
    }

    verifications.replace_one(
        {"email": email},
        record,
        upsert=True,
    )

    try:
        send_otp_email(email, otp)
    except Exception as error:
        verifications.delete_one(
            {
                "email": email,
                "otpHash": record["otpHash"],
            }
        )
        raise RuntimeError("Could not send verification email") from error

    return {
        "message": "Verification code sent. Check your email."
    }


def verify_registration(
    database: Database,
    request: VerifyOtpRequest,
) -> dict[str, str]:
    """Verify an OTP and create a POI Owner account."""
    _ensure_indexes(database)

    email = str(request.email).strip().lower()
    verifications = database["email_verifications"]
    users = database["users"]

    now = datetime.now(timezone.utc)

    record = verifications.find_one({"email": email})

    if not record or record.get("used"):
        raise ValueError("No active verification request was found")

    if record["expiresAt"].replace(tzinfo=timezone.utc) <= now:
        verifications.delete_one({"email": email})
        raise ValueError("The verification code has expired")


    if record.get("attempts", 0) >= OTP_MAX_ATTEMPTS:
        verifications.delete_one({"email": email})
        raise ValueError("Too many incorrect attempts. Request a new code.")

    expected_hash = record["otpHash"]
    submitted_hash = _hash_otp(email, request.otp)

    if not hmac.compare_digest(expected_hash, submitted_hash):
        verifications.update_one(
            {"_id": record["_id"]},
            {"$inc": {"attempts": 1}},
        )
        raise ValueError("Invalid verification code")

    user = {
        "fullName": record["fullName"],
        "email": email,
        "passwordHash": record["passwordHash"],
        "role": "poi_owner",
        "emailVerified": True,
        "approvalStatus": "pending",
        "createdAt": now,
        "updatedAt": now,
    }

    try:
        users.insert_one(user)
    except DuplicateKeyError as error:
        verifications.delete_one({"_id": record["_id"]})
        raise ValueError("This email is already registered") from error

    verifications.delete_one({"_id": record["_id"]})

    return {
        "message": "Email verified. Your account is waiting for Admin approval."
    }


def resend_registration_otp(
    database: Database,
    email: str,
) -> dict[str, str]:
    """Resend an OTP for an existing pending registration."""
    email = email.strip().lower()

    users = database["users"]
    verifications = database["email_verifications"]

    if users.find_one({"email": email}, {"_id": 1}):
        raise ValueError("This email is already registered")

    record = verifications.find_one({"email": email})

    if not record or record.get("used"):
        raise ValueError(
            "No active registration found. Please register again."
        )

    now = datetime.now(timezone.utc)
    last_sent = record.get("lastSentAt")

    if last_sent and (
        now - last_sent
    ).total_seconds() < OTP_RESEND_COOLDOWN_SECONDS:
        raise ValueError("Please wait before requesting another OTP")

    resend_count = record.get("resendCount", 0)

    if resend_count >= 5:
        raise ValueError(
            "Resend limit reached. Please start registration again later."
        )

    otp = f"{secrets.randbelow(1_000_000):06d}"
    new_hash = _hash_otp(email, otp)

    # Replace the old OTP before sending the new one.
    # The previous OTP becomes invalid immediately.
    verifications.update_one(
        {"_id": record["_id"]},
        {
            "$set": {
                "otpHash": new_hash,
                "createdAt": now,
                "lastSentAt": now,
                "expiresAt": now + timedelta(minutes=OTP_TTL_MINUTES),
                "attempts": 0,
            },
            "$inc": {"resendCount": 1},
        },
    )

    try:
        send_otp_email(email, otp)
    except Exception as error:
        # Do not leave a verification record with an OTP
        # that was not successfully sent.
        verifications.delete_one(
            {"_id": record["_id"], "otpHash": new_hash}
        )
        raise RuntimeError(
            "Could not send verification email. Please register again."
        ) from error

    return {
        "message": "A new verification code has been sent."
    }