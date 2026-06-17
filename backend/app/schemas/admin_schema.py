from pydantic import BaseModel, EmailStr

class AdminRegister(BaseModel):
    admin_id: str
    email: EmailStr
    password: str
    security_code: str