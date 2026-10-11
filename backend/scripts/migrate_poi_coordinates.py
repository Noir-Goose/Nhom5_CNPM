
import os
from pathlib import Path

import certifi
from dotenv import load_dotenv
from pymongo import MongoClient

# Đọc biến môi trường từ backend/.env
BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME")

if not MONGODB_URI or not MONGODB_DB_NAME:
    raise RuntimeError(
        f"Không đọc được MONGODB_URI hoặc MONGODB_DB_NAME "
        f"từ file: {BACKEND_DIR / '.env'}"
    )

# Chỉ điền tọa độ GPS đã xác minh.
POI_COORDINATES = {
    # Ví dụ cấu trúc:
    # "poi-001": {"latitude": 10.123456, "longitude": 106.123456},
}


def main():
    client = MongoClient(
        MONGODB_URI,
        tls=True,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=15000,
    )

    try:
        client.admin.command("ping")
        collection = client[MONGODB_DB_NAME]["pois"]
        print("Kết nối MongoDB thành công.")

        if not POI_COORDINATES:
            print(
                "Chưa có tọa độ GPS trong POI_COORDINATES. "
                "Chưa cập nhật dữ liệu nào."
            )
            return

        for poi_id, coordinates in POI_COORDINATES.items():
            latitude = float(coordinates["latitude"])
            longitude = float(coordinates["longitude"])

            if not (-90 <= latitude <= 90):
                raise ValueError(f"Latitude không hợp lệ: {poi_id}")

            if not (-180 <= longitude <= 180):
                raise ValueError(f"Longitude không hợp lệ: {poi_id}")

            result = collection.update_one(
                {"id": poi_id},
                {
                    "$set": {
                        "latitude": latitude,
                        "longitude": longitude,
                    }
                },
            )

            if result.matched_count == 0:
                print(f"Không tìm thấy POI: {poi_id}")
            else:
                print(f"Đã cập nhật tọa độ: {poi_id}")

    finally:
        client.close()


if __name__ == "__main__":
    main()
