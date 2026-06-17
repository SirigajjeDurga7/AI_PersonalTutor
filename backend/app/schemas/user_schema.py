from pydantic import BaseModel, EmailStr
from typing import List

class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    mobile_number: str
    password: str
    educational_level: str
    institution_name: str
    preferred_learning_interests: List[str]
    role: str