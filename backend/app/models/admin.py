from datetime import datetime

def admin_document(data):
    return {
        "admin_id": data.admin_id,
        "email": data.email,
        "password": data.password,
        "security_code": data.security_code,
        "created_at": datetime.utcnow()
    }