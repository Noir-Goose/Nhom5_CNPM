import os
import smtplib
from email.message import EmailMessage
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")


def send_otp_email(recipient: str, otp: str) -> None:
    """Send an email containing an OTP to the recipient."""
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    from_email = os.getenv("SMTP_FROM_EMAIL", "").strip()

    if not all(
        [smtp_host, smtp_username, smtp_password, from_email]
    ):
        raise RuntimeError("SMTP settings are incomplete in backend/.env")

    message = EmailMessage()
    message["Subject"] = "Verify your POI Owner account"
    message["From"] = from_email
    message["To"] = recipient
    message.set_content(
        f"Your email verification code is: {otp}\n\n"
        "This code is for email verification. "
        "Do not share it with anyone.\n"
        "If you did not request this code, you can ignore this email."
    )

    with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.send_message(message)