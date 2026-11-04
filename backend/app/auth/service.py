import hashlib
import hmac
import logging
import os
import secrets
from datetime import UTC, datetime, timedelta

from dotenv import load_dotenv
from pymongo import ASCENDING
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from app.auth.email_service import send_otp_email
from app.auth.schemas import (
    CompletePasswordReset,
    OwnerRegistrationRequest,
    RequestPasswordReset,
    VerifyLoginOtpRequest,
    VerifyOtpRequest,
)
from app.auth.security import hash_password


def _ensure_utc(value: datetime | None) -> datetime | None:
    """Normalize a datetime value to timezone-aware UTC."""
    if value is None:
        return None

    if value.tzinfo is None:
        # MongoDB may return naive datetimes representing UTC.
        return value.replace(tzinfo=UTC)

    return value.astimezone(UTC)

BACKEND_DIR = __import__("pathlib").Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")

OTP_SECRET = os.getenv("JWT_SECRET_KEY", "").strip()

OTP_TTL_MINUTES = 10
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_COOLDOWN_SECONDS = 60
logger = logging.getLogger(__name__)


def _hash_otp(email: str, otp: str) -> str:
    """Hash an OTP using a server-side secret."""
    if not OTP_SECRET:
        raise RuntimeError("JWT_SECRET_KEY is not configured")

    message = f"{email.lower()}:{otp}".encode()
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
    database["users"].create_index(
        [("accountName", ASCENDING)],
        unique=True,
        sparse=True,
    )
    database["email_verifications"].create_index(
        [("accountName", ASCENDING)],
        unique=True,
        sparse=True,
    )


def start_registration(
    database: Database,
    request: OwnerRegistrationRequest,
) -> dict[str, str]:
    """Create a pending email verification and send its OTP."""
    _ensure_indexes(database)

    email = str(request.email).strip().lower()
    account_name = request.account_name.strip().lower()
    users = database["users"]
    verifications = database["email_verifications"]

    if users.find_one({"email": email}, {"_id": 1}):
        raise ValueError("This email is already registered")

    if users.find_one({"accountName": account_name}, {"_id": 1}):
        raise ValueError("This account name is already registered")

    if verifications.find_one(
        {"accountName": account_name, "email": {"$ne": email}},
        {"_id": 1},
    ):
        raise ValueError("This account name is already in use")

    existing = verifications.find_one({"email": email})

    now = datetime.now(UTC)

    if existing:
        last_sent = _ensure_utc(existing.get("lastSentAt"))
        if last_sent and (now - last_sent).total_seconds() < OTP_RESEND_COOLDOWN_SECONDS:
            raise ValueError("Please wait before requesting another OTP")

    otp = f"{secrets.randbelow(1_000_000):06d}"

    record = {
        "email": email,
        "accountName": account_name,
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

    try:
        verifications.replace_one({"email": email}, record, upsert=True)
    except DuplicateKeyError as error:
        raise ValueError("This account name is already in use") from error

    try:
        send_otp_email(email, otp)
    except Exception as error:
        if isinstance(error, RuntimeError):
            diagnostic = str(error)
        else:
            diagnostic = type(error).__name__
        logger.error("POI Owner verification email failed: %s", diagnostic)
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

    now = datetime.now(UTC)

    record = verifications.find_one({"email": email})

    if not record or record.get("used"):
        raise ValueError("No active verification request was found")

    expires_at = _ensure_utc(record["expiresAt"])

    if expires_at is None or expires_at <= now:
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
    if record.get("accountName"):
        user["accountName"] = record["accountName"]

    try:
        users.insert_one(user)
    except DuplicateKeyError as error:
        verifications.delete_one({"_id": record["_id"]})
        if user.get("accountName") and users.find_one(
            {"accountName": user["accountName"]}, {"_id": 1}
        ):
            raise ValueError("This account name is already registered") from error
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

    now = datetime.now(UTC)
    last_sent = _ensure_utc(record.get("lastSentAt"))

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
        if isinstance(error, RuntimeError):
            diagnostic = str(error)
        else:
            diagnostic = type(error).__name__
        logger.error("POI Owner OTP resend failed: %s", diagnostic)
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


def _can_use_email_login_otp(user: dict | None) -> bool:
    if not user or not user.get("emailVerified", False):
        return False

    role = user.get("role")
    if role not in {"admin", "poi_owner"}:
        return False
    if role == "poi_owner":
        return user.get("isActive", True) is not False and user.get("approvalStatus") == "approved"
    return True


def _can_reset_password(user: dict | None) -> bool:
    return bool(
        user
        and user.get("emailVerified", False)
        and user.get("role") in {"admin", "poi_owner"}
    )


def start_password_reset(
    database: Database,
    request: RequestPasswordReset,
) -> dict[str, str]:
    """Send a password-reset OTP without revealing whether an email exists."""
    email = str(request.email).strip().lower()
    verifications = database["password_reset_verifications"]
    verifications.create_index([("email", ASCENDING)], unique=True)
    generic_message = (
        "Nếu email thuộc tài khoản đã xác minh, mã đặt lại mật khẩu sẽ được gửi.")

    user = database["users"].find_one({"email": email})
    if not _can_reset_password(user):
        return {"message": generic_message}

    now = datetime.now(UTC)
    existing = verifications.find_one({"email": email}, {"lastSentAt": 1})
    last_sent = _ensure_utc(existing.get("lastSentAt")) if existing else None
    if last_sent and (now - last_sent).total_seconds() < OTP_RESEND_COOLDOWN_SECONDS:
        return {"message": generic_message}

    otp = f"{secrets.randbelow(1_000_000):06d}"
    record = {
        "email": email,
        "otpHash": _hash_otp(email, otp),
        "createdAt": now,
        "lastSentAt": now,
        "expiresAt": now + timedelta(minutes=OTP_TTL_MINUTES),
        "attempts": 0,
    }
    verifications.replace_one({"email": email}, record, upsert=True)

    try:
        send_otp_email(email, otp, purpose="password_reset")
    except Exception as error:
        diagnostic = str(error) if isinstance(error, RuntimeError) else type(error).__name__
        logger.error("Password reset OTP email failed: %s", diagnostic)
        verifications.delete_one({"email": email, "otpHash": record["otpHash"]})
        raise RuntimeError("Could not send password reset code") from error

    return {"message": generic_message}


def complete_password_reset(
    database: Database,
    request: CompletePasswordReset,
) -> dict[str, str]:
    """Validate a reset OTP and replace the account password."""
    email = str(request.email).strip().lower()
    verifications = database["password_reset_verifications"]
    record = verifications.find_one({"email": email})
    if not record:
        raise ValueError("Mã OTP không hợp lệ hoặc đã hết hạn")

    now = datetime.now(UTC)
    expires_at = _ensure_utc(record.get("expiresAt"))
    if expires_at is None or expires_at <= now:
        verifications.delete_one({"_id": record["_id"]})
        raise ValueError("Mã OTP không hợp lệ hoặc đã hết hạn")

    if record.get("attempts", 0) >= OTP_MAX_ATTEMPTS:
        verifications.delete_one({"_id": record["_id"]})
        raise ValueError("Bạn đã nhập sai quá số lần cho phép. Hãy yêu cầu mã mới")

    submitted_hash = _hash_otp(email, request.otp)
    if not hmac.compare_digest(record["otpHash"], submitted_hash):
        verifications.update_one({"_id": record["_id"]}, {"$inc": {"attempts": 1}})
        raise ValueError("Mã OTP không hợp lệ hoặc đã hết hạn")

    user = database["users"].find_one({"email": email})
    if not _can_reset_password(user):
        verifications.delete_one({"_id": record["_id"]})
        raise ValueError("Không thể đặt lại mật khẩu cho tài khoản này")

    database["users"].update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "passwordHash": hash_password(request.new_password),
                "updatedAt": now,
            }
        },
    )
    verifications.delete_one({"_id": record["_id"]})
    database["login_otp_verifications"].delete_one({"email": email})
    return {"message": "Mật khẩu đã được đặt lại. Bạn có thể đăng nhập bằng mật khẩu mới."}


def start_login_otp(database: Database, email: str) -> dict[str, str]:
    """Send a one-time sign-in code without revealing whether an email exists."""
    _ensure_indexes(database)
    email = email.strip().lower()
    verifications = database["login_otp_verifications"]
    verifications.create_index([("email", ASCENDING)], unique=True)

    generic_message = (
        "Nếu email thuộc tài khoản đủ điều kiện, mã OTP đăng nhập đã được gửi."
    )
    user = database["users"].find_one({"email": email})
    if not _can_use_email_login_otp(user):
        return {"message": generic_message}

    now = datetime.now(UTC)
    existing = verifications.find_one({"email": email}, {"lastSentAt": 1})
    last_sent = _ensure_utc(existing.get("lastSentAt")) if existing else None
    if last_sent and (now - last_sent).total_seconds() < OTP_RESEND_COOLDOWN_SECONDS:
        return {"message": generic_message}

    otp = f"{secrets.randbelow(1_000_000):06d}"
    record = {
        "email": email,
        "otpHash": _hash_otp(email, otp),
        "createdAt": now,
        "lastSentAt": now,
        "expiresAt": now + timedelta(minutes=OTP_TTL_MINUTES),
        "attempts": 0,
    }
    verifications.replace_one({"email": email}, record, upsert=True)

    try:
        send_otp_email(email, otp, purpose="login")
    except Exception as error:
        diagnostic = str(error) if isinstance(error, RuntimeError) else type(error).__name__
        logger.error("Sign-in OTP email failed: %s", diagnostic)
        verifications.delete_one({"email": email, "otpHash": record["otpHash"]})
        raise RuntimeError("Could not send sign-in code") from error

    return {"message": generic_message}


def verify_login_otp(database: Database, request: VerifyLoginOtpRequest) -> dict:
    """Validate a sign-in OTP and return the eligible account."""
    email = str(request.email).strip().lower()
    verifications = database["login_otp_verifications"]
    record = verifications.find_one({"email": email})
    if not record:
        raise ValueError("Mã OTP không hợp lệ hoặc đã hết hạn")

    now = datetime.now(UTC)
    expires_at = _ensure_utc(record.get("expiresAt"))
    if expires_at is None or expires_at <= now:
        verifications.delete_one({"_id": record["_id"]})
        raise ValueError("Mã OTP không hợp lệ hoặc đã hết hạn")

    if record.get("attempts", 0) >= OTP_MAX_ATTEMPTS:
        verifications.delete_one({"_id": record["_id"]})
        raise ValueError("Bạn đã nhập sai quá số lần cho phép. Hãy yêu cầu mã mới")

    submitted_hash = _hash_otp(email, request.otp)
    if not hmac.compare_digest(record["otpHash"], submitted_hash):
        verifications.update_one({"_id": record["_id"]}, {"$inc": {"attempts": 1}})
        raise ValueError("Mã OTP không hợp lệ hoặc đã hết hạn")

    user = database["users"].find_one({"email": email})
    verifications.delete_one({"_id": record["_id"]})
    if not _can_use_email_login_otp(user):
        raise ValueError("Tài khoản chưa được phép đăng nhập")

    return user
