import json
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any
from app.poi.router import router as poi_owner_router
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from app.auth.router import router as auth_router

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

MONGODB_URI = os.getenv("MONGODB_URI", "").strip()
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "q4_food_guide").strip()
FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

client: MongoClient | None = None
database: Any = None


def seed_initial_pois() -> None:
    """Insert initial demo POIs only when the public POI collection is empty."""
    if database is None:
        raise RuntimeError("Database is not initialized")

    pois_collection = database["pois"]
    if pois_collection.count_documents({}) > 0:
        return

    seed_path = BACKEND_DIR / "data" / "initial_pois.json"
    with seed_path.open("r", encoding="utf-8") as seed_file:
        initial_pois = json.load(seed_file)

    if not isinstance(initial_pois, list):
        raise TypeError("initial_pois.json must contain a JSON array")

    if initial_pois:
        pois_collection.insert_many(initial_pois)
        print(f"Seeded {len(initial_pois)} initial POIs into MongoDB.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global client, database

    if not MONGODB_URI or "<db_username>" in MONGODB_URI or "<db_password>" in MONGODB_URI:
        raise RuntimeError(
            "MONGODB_URI is not configured. Copy backend/.env.example to backend/.env "
            "and fill in your MongoDB Atlas connection string."
        )

    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=7000)
    try:
        client.admin.command("ping")
        database = client[MONGODB_DB_NAME]
        app.state.database = database
        seed_initial_pois()
        print(f"Connected to MongoDB database: {MONGODB_DB_NAME}")
    except Exception:
        client.close()
        client = None
        database = None
        raise

    try:
        yield
    finally:
        if client is not None:
            client.close()
        client = None
        database = None


app = FastAPI(
    title="Quan 4 Food Guide API",
    version="0.1.0",
    description="Initial public POI API backed by MongoDB. Owner/Admin workflows will be added next.",
    lifespan=lifespan,
)

app.include_router(auth_router)
app.include_router(poi_owner_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


def serialize_poi(document: dict[str, Any]) -> dict[str, Any]:
    """Return the existing frontend POI shape and omit MongoDB's internal _id."""
    result = dict(document)
    result.pop("_id", None)
    return result


@app.get("/health/ready")
def readiness_check():
    try:
        if database is None:
            raise RuntimeError("Database is not initialized")
        database.command("ping")
        return {"status": "ready", "database": MONGODB_DB_NAME}
    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail="Database is not ready",
        ) from error


@app.get("/api/v1/poi/load-all")
def load_all_pois(lang: str = Query(default="vi", min_length=2, max_length=5)):
    """Public endpoint: return active POIs, retaining all locale entries for the current UI."""
    if database is None:
        raise HTTPException(status_code=503, detail="Database is not ready")

    try:
        documents = database["pois"].find(
            {"isActive": {"$ne": False}},
            {"_id": 0},
        )
        pois = list(documents)
        # Existing React components expect poi.content[language]. Preserve all content locales.
        return [serialize_poi(poi) for poi in pois]
    except PyMongoError as error:
        raise HTTPException(
            status_code=503,
            detail="Could not load POIs from database",
        ) from error


@app.get("/api/v1/poi/{poi_id}")
def get_poi(poi_id: str):
    if database is None:
        raise HTTPException(status_code=503, detail="Database is not ready")

    try:
        document = database["pois"].find_one(
            {"id": poi_id, "isActive": {"$ne": False}},
            {"_id": 0},
        )
    except PyMongoError as error:
        raise HTTPException(
            status_code=503,
            detail="Could not load POI from database",
        ) from error

    if document is None:
        raise HTTPException(status_code=404, detail="POI not found")

    return serialize_poi(document)
