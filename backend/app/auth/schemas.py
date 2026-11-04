from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, StringConstraints

FullName = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=2,
        max_length=100,
    ),
]

AccountName = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        to_lower=True,
        min_length=3,
        max_length=30,
        pattern=r"^[a-zA-Z0-9_.-]+$",
    ),
]

Password = Annotated[
    str,
    StringConstraints(
        min_length=12,
        max_length=128,
    ),
]

OtpCode = Annotated[
    str,
    StringConstraints(pattern=r"^\d{6}$"),
]


class OwnerRegistrationRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    account_name: AccountName
    full_name: FullName
    email: EmailStr
    password: Password


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: OtpCode


class ResendOtpRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyLoginOtpRequest(BaseModel):
    email: EmailStr
    otp: OtpCode


class RequestPasswordReset(BaseModel):
    email: EmailStr


class CompletePasswordReset(BaseModel):
    email: EmailStr
    otp: OtpCode
    new_password: Password

class LoginRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: Annotated[
        str,
        StringConstraints(min_length=1, max_length=128),
    ]
