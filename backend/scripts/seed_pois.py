
import json
import os
from pathlib import Path

import certifi
from dotenv import load_dotenv
from pymongo import MongoClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "q4_food_guide")

DATA_FILE = BACKEND_DIR / "data" / "initial_pois.json"


def main():
    if not MONGODB_URI:
        raise RuntimeError("Thiếu MONGODB_URI trong backend/.env")

    with DATA_FILE.open("r", encoding="utf-8") as file:
        pois = json.load(file)

    if not isinstance(pois, list) or not pois:
        raise ValueError("initial_pois.json phải chứa một danh sách POI.")

    ids = [poi.get("id") for poi in pois]
    if any(not poi_id for poi_id in ids) or len(ids) != len(set(ids)):
        raise ValueError("Mỗi POI phải có id riêng biệt.")

    for poi in pois:
        if not isinstance(poi.get("content"), dict):
            raise ValueError(
                f"POI {poi['id']} thiếu content theo ngôn ngữ."
            )

        latitude = poi.get("latitude")
        longitude = poi.get("longitude")

        if latitude is None or longitude is None:
            raise ValueError(
                f"POI {poi['id']} chưa có latitude/longitude GPS thật."
            )

        if not -90 <= float(latitude) <= 90:
            raise ValueError(f"Latitude không hợp lệ: {poi['id']}")

        if not -180 <= float(longitude) <= 180:
            raise ValueError(f"Longitude không hợp lệ: {poi['id']}")

    client = MongoClient(
        MONGODB_URI,
        tls=True,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=15000,
    )

    try:
        client.admin.command("ping")
        collection = client[MONGODB_DB_NAME]["pois"]

        if collection.count_documents({}) > 0:
            raise RuntimeError(
                "Collection pois không trống. Dừng để tránh chèn trùng."
            )

        collection.insert_many(pois)
        print(f"Đã thêm {len(pois)} POI vào MongoDB.")
    finally:
        client.close()


if __name__ == "__main__":
    main()
