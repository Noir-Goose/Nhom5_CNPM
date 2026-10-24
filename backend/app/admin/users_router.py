from datetime import UTC, datetime
from typing import Annotated, Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints
from pymongo.errors import DuplicateKeyError, PyMongoError

from app.auth.admin_dependencies import get_current_admin
from app.auth.security import hash_password
from app.audit.service import record_audit_event

router = APIRouter(prefix="/api/v1/admin/users", tags=["Admin - User Management"])
UserRole = Literal["admin", "poi_owner"]
FullName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)]
Password = Annotated[str, StringConstraints(min_length=12, max_length=128)]


class UserCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    fullName: FullName
    email: EmailStr
    password: Password
    role: UserRole


class UserUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    fullName: FullName
    email: EmailStr
    role: UserRole
    password: str | None = Field(default=None, min_length=12, max_length=128)



class UserStatusUpdate(BaseModel):
    isActive: bool


def get_database(request: Request):
    database = getattr(request.app.state, "database", None)
    if database is None:
        raise HTTPException(status_code=503, detail="Database is not ready")
    return database


def serialize_user(user: dict) -> dict:
    created_at = user.get("createdAt")
    updated_at = user.get("updatedAt")
    return {
        "id": str(user["_id"]),
        "fullName": user.get("fullName", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "poi_owner"),
        "isActive": user.get("isActive", True) is not False,
        "approvalStatus": user.get("approvalStatus"),
        "emailVerified": bool(user.get("emailVerified", False)),
        "createdAt": created_at.isoformat() if created_at else None,
        "updatedAt": updated_at.isoformat() if updated_at else None,
    }


@router.get("")
def list_users(
    database=Depends(get_database),
    admin=Depends(get_current_admin),
):
    try:
        database["users"].create_index("email", unique=True)
        users = database["users"].find(
            {},
            {"passwordHash": 0, "otpHash": 0},
        ).sort("createdAt", -1)
        return [serialize_user(user) for user in users]
    except PyMongoError as error:
        raise HTTPException(status_code=503, detail="Could not load users") from error


@router.post("", status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    database=Depends(get_database),
    admin=Depends(get_current_admin),
):
    now = datetime.now(UTC)
    email = str(payload.email).strip().lower()
    user = {
        "fullName": payload.fullName,
        "email": email,
        "passwordHash": hash_password(payload.password),
        "role": payload.role,
        "isActive": True,
        "emailVerified": True,
        "createdAt": now,
        "updatedAt": now,
    }
    if payload.role == "poi_owner":
        user["approvalStatus"] = "approved"
    try:
        database["users"].create_index("email", unique=True)
        result = database["users"].insert_one(user)
        user["_id"] = result.inserted_id
        record_audit_event(
            database, actor=admin, action="user.create", resource_type="user",
            resource_id=str(result.inserted_id), outcome="success",
            summary="Admin created a user account",
            changes={"email": {"after": email}, "fullName": {"after": payload.fullName}, "role": {"after": payload.role}},
        )
        return serialize_user(user)
    except DuplicateKeyError as error:
        raise HTTPException(status_code=409, detail="Email này đã được sử dụng.") from error
    except PyMongoError as error:
        raise HTTPException(status_code=503, detail="Could not create user") from error


@router.put("/{user_id}")
def update_user(
    user_id: str,
    payload: UserUpdate,
    database=Depends(get_database),
    admin=Depends(get_current_admin),
):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Mã người dùng không hợp lệ.")

    target_id = ObjectId(user_id)
    if str(admin["_id"]) == user_id and payload.role != "admin":
        raise HTTPException(status_code=400, detail="Không thể tự đổi vai trò Admin của chính mình.")

    email = str(payload.email).strip().lower()
    updates = {
        "fullName": payload.fullName,
        "email": email,
        "role": payload.role,
        "updatedAt": datetime.now(UTC),
    }
    if payload.password:
        updates["passwordHash"] = hash_password(payload.password)
    if payload.role == "poi_owner":
        updates["approvalStatus"] = "approved"
    else:
        updates["approvalStatus"] = None

    try:
        database["users"].create_index("email", unique=True)
        previous = database["users"].find_one({"_id": target_id}, {"fullName": 1, "email": 1, "role": 1})
        result = database["users"].update_one({"_id": target_id}, {"$set": updates})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
        user = database["users"].find_one({"_id": target_id}, {"passwordHash": 0})
        record_audit_event(
            database, actor=admin, action="user.update", resource_type="user",
            resource_id=user_id, outcome="success", summary="Admin updated a user account",
            changes={
                "fullName": {"before": previous.get("fullName") if previous else None, "after": payload.fullName},
                "email": {"before": previous.get("email") if previous else None, "after": email},
                "role": {"before": previous.get("role") if previous else None, "after": payload.role},
            },
        )
        if payload.role == "admin":
            user.pop("approvalStatus", None)
        return serialize_user(user)
    except DuplicateKeyError as error:
        raise HTTPException(status_code=409, detail="Email này đã được sử dụng.") from error
    except PyMongoError as error:
        raise HTTPException(status_code=503, detail="Could not update user") from error


@router.patch("/{user_id}/status")
def update_user_status(
    user_id: str,
    payload: UserStatusUpdate,
    database=Depends(get_database),
    admin=Depends(get_current_admin),
):
    """Lock or unlock a non-admin account. Admin accounts are never lockable."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Mã người dùng không hợp lệ.")

    target_id = ObjectId(user_id)
    try:
        users = database["users"]
        target = users.find_one({"_id": target_id}, {"passwordHash": 0, "otpHash": 0})
        if target is None:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
        if target.get("role") == "admin":
            raise HTTPException(status_code=400, detail="Không thể khóa hoặc mở khóa tài khoản Admin.")

        previous_active = target.get("isActive", True) is not False
        users.update_one(
            {"_id": target_id},
            {"$set": {"isActive": payload.isActive, "updatedAt": datetime.now(UTC)}},
        )
        record_audit_event(
            database, actor=admin, action="user.status_change", resource_type="user",
            resource_id=user_id, outcome="success", summary="Admin changed user account status",
            changes={"isActive": {"before": previous_active, "after": payload.isActive}},
        )
        target["isActive"] = payload.isActive
        target["updatedAt"] = datetime.now(UTC)
        return serialize_user(target)
    except PyMongoError as error:
        raise HTTPException(status_code=503, detail="Không thể cập nhật trạng thái người dùng.") from error

