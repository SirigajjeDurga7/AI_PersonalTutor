from datetime import datetime

def instructor_document(data):
    return {
        "full_name": data.full_name,
        "email": data.email,
        "phone_number": data.phone_number,
        "qualification": data.qualification,
        "specialization": data.specialization,
        "years_of_experience": data.years_of_experience,
        "password": data.password,
        "created_at": datetime.utcnow()
    }