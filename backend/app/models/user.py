from datetime import datetime

def user_document(data):
    return {
        "full_name": data.full_name,
        "email": data.email,
        "mobile_number": data.mobile_number,
        "password": data.password,
        "educational_level": data.educational_level,
        "institution_name": data.institution_name,
        "preferred_learning_interests": data.preferred_learning_interests,
        "role": data.role,
        "created_at": datetime.utcnow()
    }