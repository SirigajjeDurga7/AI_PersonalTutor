from pydantic import BaseModel, EmailStr

class InstructorRegister(BaseModel):
    full_name: str
    email: EmailStr
    phone_number: str
    qualification: str
    specialization: str
    years_of_experience: int
    password: str