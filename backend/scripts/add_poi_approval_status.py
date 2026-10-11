
import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

MONGODB_URI = os.getenv("MONGODB_URI", "").strip()
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "q4_food_guide").strip()


def main():
    if not MONGODB_URI:
        raise RuntimeError("MONGODB_URI is missing from backend/.env")

    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=7000)

    try:
        client.admin.command("ping")
        database = client[MONGODB_DB_NAME]
        pois = database["pois"]

        result = pois.update_many(
            {"approvalStatus": {"$exists": False}},
            {"$set": {"approvalStatus": "approved"}},
        )

        print(f"Database: {MONGODB_DB_NAME}")
        print(f"Matched documents: {result.matched_count}")
        print(f"Modified documents: {result.modified_count}")

        for poi in pois.find(
            {},
            {"_id": 0, "id": 1, "poiId": 1, "approvalStatus": 1},
        ):
            print(poi)

    finally:
        client.close()


if __name__ == "__main__":
    main()
