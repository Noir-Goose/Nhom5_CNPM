
import os
import smtplib
from email.message import EmailMessage
from pathlib import Path

from dotenv import load_dotenv

# Đọc cấu hình từ backend/.env
BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env")

SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "").strip()


def main():
    # Kiểm tra xem các biến cấu hình đã được điền chưa
    if not all([
        SMTP_HOST,
        SMTP_USERNAME,
        SMTP_PASSWORD,
        SMTP_FROM_EMAIL,
    ]):
        print("THAT BAI: Thieu cau hinh SMTP trong file .env")
        return

    recipient = input("Nhap email nhan thu thu nghiem: ").strip()

    if not recipient or "@" not in recipient:
        print("THAT BAI: Email nhan khong hop le.")
        return

    message = EmailMessage()
    message["Subject"] = "Kiem tra SMTP - Q4 Food Guide"
    message["From"] = SMTP_FROM_EMAIL
    message["To"] = recipient
    message.set_content(
        "Xin chao!\n\n"
        "Day la email kiem tra cau hinh SMTP "
        "cho du an Q4 Food Guide.\n"
        "Neu ban nhan duoc email nay, SMTP dang hoat dong."
    )

    try:
        print("Dang ket noi den Gmail SMTP...")

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()

            print("Dang dang nhap Gmail...")
            server.login(SMTP_USERNAME, SMTP_PASSWORD)

            print("Dang gui email...")
            server.send_message(message)

        print("THANH CONG: Email da duoc Gmail chap nhan gui.")

    except smtplib.SMTPAuthenticationError:
        print(
            "THAT BAI: Gmail tu choi dang nhap. "
            "Hay kiem tra SMTP_USERNAME va App Password."
        )
    except (smtplib.SMTPException, OSError, ValueError) as error:
        print(f"THAT BAI: {type(error).__name__}: {error}")


if __name__ == "__main__":
    main()
