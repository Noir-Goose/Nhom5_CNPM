from fastapi import APIRouter, HTTPException, Request, status
from pymongo.database import Database
from pymongo.errors import PyMongoError

from app.auth.schemas import (
    OwnerRegistrationRequest,
    VerifyOtpRequest,
    ResendOtpRequest,
)
from app.auth.service import (
    start_registration,
    verify_registration,
    resend_registration_otp,
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