
from datetime import UTC, datetime

from pymongo import ASCENDING, MongoClient
from pymongo.errors import DuplicateKeyError

from app.auth.security import hash_password


ADMIN_EMAIL = "admin@example.com"
OWNER_EMAIL = "owner@example.com"

# Chỉ dùng cho môi trường phát triển.
ADMIN_PASSWORD = "AdminDev123456!"
OWNER_PASSWORD = "OwnerDev123456!"


def main() -> None:
    import os
    from pathlib import Path

    from dotenv import load_dotenv

    backend_dir = Path(__file__).resolve().parents[1]
    load_dotenv(backend_dir / ".env")

    mongodb_uri = os.getenv("MONGODB_URI", "").strip()
    database_name = os.getenv("MONGODB_DB_NAME", "q4_food_guide").strip()

    if not mongodb_uri or "<db_username>" in mongodb_uri:
        raise RuntimeError("Please configure MONGODB_URI in backend/.env")

    with MongoClient(mongodb_uri, serverSelectionTimeoutMS=7000) as client:
        client.admin.command("ping")
        database = client[database_name]
        users = database["users"]

        users.create_index([("email", ASCENDING)], unique=True)

        now = datetime.now(UTC)
        test_users = [
            {
                "fullName": "Development Admin",
                "email": ADMIN_EMAIL,
                "passwordHash": hash_password(ADMIN_PASSWORD),
                "role": "admin",
                "emailVerified": True,
                "approvalStatus": "approved",
                "createdAt": now,
                "updatedAt": now,
            },
            {
                "fullName": "Development POI Owner",
                "email": OWNER_EMAIL,
                "passwordHash": hash_password(OWNER_PASSWORD),
                "role": "poi_owner",
                "emailVerified": True,
                "approvalStatus": "approved",
                "createdAt": now,
                "updatedAt": now,
            },
        ]

        for user in test_users:
            try:
                users.insert_one(user)
                print(f"Created test account: {user['email']}")
            except DuplicateKeyError:
                print(
                    f"Skipped {user['email']}: "
                    "an account with this email already exists."
                )

    print("Finished creating test accounts.")


if __name__ == "__main__":
    main()
