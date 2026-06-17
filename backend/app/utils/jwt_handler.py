# app/utils/jwt_handler.py

from jose import jwt
from datetime import datetime, timedelta

SECRET_KEY = "ai_lms_super_secret_key_2025"
ALGORITHM = "HS256"

def create_access_token(data: dict):

    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(days=1)

    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )