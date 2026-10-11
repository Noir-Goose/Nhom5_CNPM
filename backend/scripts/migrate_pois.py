
import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

MONGODB_URI = os.getenv("MONGODB_URI", "").strip()
MONGODB_DB_NAME = os.getenv(
    "MONGODB_DB_NAME", "q4_food_guide"
).strip()

# Đổi thành True sau khi đã kiểm tra kết quả xem trước.
APPLY_CHANGES = False


def main():
    if not MONGODB_URI:
        raise RuntimeError("Thiếu MONGODB_URI trong backend/.env")

    client = MongoClient(
        MONGODB_URI,
        serverSelectionTimeoutMS=15000,
    )

    try:
        client.admin.command("ping")

        db = client[MONGODB_DB_NAME]
        pois = db["pois"]

        missing_status = {
            "approvalStatus": {"$exists": False}
        }

        count = pois.count_documents(missing_status)

        print(f"Database: {MONGODB_DB_NAME}")
        print(f"POI chưa có approvalStatus: {count}")

        # Xem trước một số document cần xử lý.
        for poi in pois.find(
            missing_status,
            {
                "_id": 1,
                "id": 1,
                "name": 1,
                "approvalStatus": 1,
            },
        ).limit(10):
            print(poi)

        if not APPLY_CHANGES:
            print("DRY RUN: chưa thay đổi dữ liệu.")
            print("Kiểm tra dữ liệu rồi mới bật APPLY_CHANGES.")
            return

        # Chỉ chạy khi đã xác nhận các POI này đều được duyệt.
        result = pois.update_many(
            missing_status,
            {"$set": {"approvalStatus": "approved"}},
        )

        print(f"Đã khớp: {result.matched_count}")
        print(f"Đã cập nhật: {result.modified_count}")

    finally:
        client.close()


if __name__ == "__main__":
    main()
