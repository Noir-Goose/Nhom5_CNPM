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

    full_name: FullName
    email: EmailStr
    password: Password


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: OtpCode


class ResendOtpRequest(BaseModel):
    email: EmailStr