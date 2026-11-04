import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")

BREVO_EMAIL_API_URL = "https://api.brevo.com/v3/smtp/email"


def send_otp_email(recipient: str, otp: str, purpose: str = "registration") -> None:
    """Send a registration or sign-in OTP through Brevo's HTTPS API."""
    api_key = os.getenv("BREVO_API_KEY", "").strip()
    sender_email = os.getenv("BREVO_SENDER_EMAIL", "").strip()
    sender_name = os.getenv("BREVO_SENDER_NAME", "FoodTour").strip()

    if not all([api_key, sender_email, sender_name]):
        raise RuntimeError("Brevo API settings are incomplete")

    if purpose == "login":
        subject = "Your POI Owner sign-in code"
        text_content = (
            f"Your sign-in code is: {otp}\n\n"
            "This code lets you sign in to your account. Do not share it with anyone.\n"
            "If you did not request this code, you can ignore this email."
        )
    elif purpose == "password_reset":
        subject = "Reset your POI Owner password"
        text_content = (
            f"Your password reset code is: {otp}\n\n"
            "This code expires in 10 minutes. Do not share it with anyone.\n"
            "If you did not request a password reset, you can ignore this email."
        )
    else:
        subject = "Verify your POI Owner account"
        text_content = (
            f"Your email verification code is: {otp}\n\n"
            "This code is for email verification. Do not share it with anyone.\n"
            "If you did not request this code, you can ignore this email."
        )
    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": recipient}],
        "subject": subject,
        "textContent": text_content,
    }
    request = Request(
        BREVO_EMAIL_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "accept": "application/json",
            "api-key": api_key,
            "content-type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=20) as response:
            if response.status != 201:
                raise RuntimeError(
                    f"Brevo email API returned unexpected HTTP {response.status}"
                )
    except HTTPError as error:
        # Do not log the response body; provider responses can include recipient data.
        raise RuntimeError(
            f"Brevo email API rejected the request (HTTP {error.code})"
        ) from error
    except URLError as error:
        # Preserve a useful network failure category without exposing request details.
        reason = error.reason
        raise RuntimeError(
            f"Brevo email API connection failed ({type(reason).__name__})"
        ) from error


def send_owner_registration_decision(
    recipient: str,
    full_name: str,
    account_name: str,
    decision: str,
    rejection_reason: str | None = None,
) -> None:
    """Email an applicant the Admin decision on their registration."""
    api_key = os.getenv("BREVO_API_KEY", "").strip()
    sender_email = os.getenv("BREVO_SENDER_EMAIL", "").strip()
    sender_name = os.getenv("BREVO_SENDER_NAME", "FoodTour").strip()
    if not all([api_key, sender_email, sender_name]):
        raise RuntimeError("Brevo API settings are incomplete")

    approved = decision == "approved"
    subject = (
        "Your POI Owner account has been approved"
        if approved
        else "Your POI Owner registration was declined"
    )
    greeting = f"Hello {full_name or account_name},"
    if approved:
        decision_text = (
            f"Your POI Owner account ({account_name}) has been approved. "
            "You can now sign in and use the owner features."
        )
    else:
        decision_text = (
            f"Your POI Owner registration ({account_name}) was declined."
        )
        if rejection_reason:
            decision_text += f"\nReason: {rejection_reason}"
    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": recipient}],
        "subject": subject,
        "textContent": f"{greeting}\n\n{decision_text}",
    }
    request = Request(
        BREVO_EMAIL_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "accept": "application/json",
            "api-key": api_key,
            "content-type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=20) as response:
            if response.status != 201:
                raise RuntimeError(
                    f"Brevo email API returned unexpected HTTP {response.status}"
                )
    except HTTPError as error:
        raise RuntimeError(
            f"Brevo email API rejected the request (HTTP {error.code})"
        ) from error
    except URLError as error:
        raise RuntimeError(
            f"Brevo email API connection failed ({type(error.reason).__name__})"
        ) from error
