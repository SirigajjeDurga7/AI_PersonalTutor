from fastapi import APIRouter
from app.schemas.user_schema import UserRegister
from app.database.mongodb import db
from app.models.user import user_document
from app.schemas.login_schema import UserLogin
from app.utils.jwt_handler import create_access_token
from app.schemas.instructor_schema import InstructorRegister
from app.schemas.admin_schema import AdminRegister

from app.models.instructor import instructor_document
from app.models.admin import admin_document
router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post("/register")
async def register_user(user: UserRegister):

    existing_user = await db.users.find_one(
        {"email": user.email}
    )

    if existing_user:
        return {
            "message": "Email already exists"
        }

    await db.users.insert_one(
        user_document(user)
    )

    return {
        "message": "User registered successfully"
    }
@router.post("/login")
async def login_user(data: UserLogin):

    user = await db.users.find_one(
        {"email": data.email}
    )

    if not user:
        return {"message": "User not found"}

    if user["password"] != data.password:
        return {"message": "Invalid password"}

    token = create_access_token(
        {
            "email": user["email"]
        }
    )

    return {
        "message": "Login successful",
        "access_token": token
    }
@router.get("/profile")
async def get_profile(email: str):

    user = await db.users.find_one(
        {"email": email},
        {"_id": 0}
    )

    return user
@router.post("/forgot-password")
async def forgot_password(email: str):

    user = await db.users.find_one(
        {"email": email}
    )

    if not user:
        return {"message": "User not found"}

    return {"message": "Password reset requested"}
@router.post("/reset-password")
async def reset_password(
    email: str,
    new_password: str
):

    await db.users.update_one(
        {"email": email},
        {"$set": {"password": new_password}}
    )

    return {"message": "Password updated"}
@router.post("/instructor/register")
async def register_instructor(data: InstructorRegister):

    await db.instructors.insert_one(
        instructor_document(data)
    )

    return {
        "message": "Instructor registered successfully"
    }
@router.post("/admin/register")
async def register_admin(data: AdminRegister):

    await db.admins.insert_one(
        admin_document(data)
    )

    return {
        "message": "Admin registered successfully"
    }
