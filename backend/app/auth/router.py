from fastapi import APIRouter, HTTPException, Request, status
from pymongo.database import Database
from pymongo.errors import PyMongoError
from app.auth.security import create_access_token, verify_password
from app.auth.schemas import (
    LoginRequest,
    OwnerRegistrationRequest,
    ResendOtpRequest,
    VerifyOtpRequest,
)
from app.auth.service import (
    resend_registration_otp,
    start_registration,
    verify_registration,
)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


def get_database(request: Request) -> Database:
    """Get the database initialized by the application lifespan."""
    database = getattr(request.app.state, "database", None)

    if database is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not ready",
        )

    return database


@router.post("/register", status_code=status.HTTP_200_OK)
def register_owner(
    payload: OwnerRegistrationRequest,
    request: Request,
):
    """Start POI Owner registration by sending an email OTP."""
    database = get_database(request)

    try:
        return start_registration(database, payload)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not send verification email",
        ) from error
    except PyMongoError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not process registration",
        ) from error


@router.post("/verify-email", status_code=status.HTTP_201_CREATED)
def verify_owner_email(
    payload: VerifyOtpRequest,
    request: Request,
):
    """Verify the OTP and create a pending POI Owner account."""
    database = get_database(request)

    try:
        return verify_registration(database, payload)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except PyMongoError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not verify registration",
        ) from error

@router.post("/resend-otp")
def resend_owner_otp(
    payload: ResendOtpRequest,
    request: Request,
):
    """Resend an OTP for an existing POI Owner registration."""
    database = get_database(request)

    try:
        return resend_registration_otp(
            database,
            str(payload.email),
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not send verification email",
        ) from error
    except PyMongoError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not process OTP request",
        ) from error

@router.post("/login")
def login(payload: LoginRequest, request: Request):
    database = get_database(request)
    email = str(payload.email).strip().lower()

    try:
        user = database["users"].find_one({"email": email})
    except PyMongoError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not process login",
        ) from error

    # Không tiết lộ email có tồn tại hay không.
    if user is None or not verify_password(
        payload.password,
        user.get("passwordHash", ""),
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    role = user.get("role")
    if role not in {"admin", "poi_owner"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account role is not allowed to log in",
        )

    if role != "admin" and user.get("isActive", True) is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.",
        )

    if not user.get("emailVerified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email first",
        )

    if role == "poi_owner" and user.get("approvalStatus") != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is awaiting Admin approval",
        )

    token = create_access_token(
        user_id=str(user["_id"]),
        role=role,
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "fullName": user.get("fullName", ""),
            "email": email,
            "role": role,
        },
    }
