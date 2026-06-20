# backend-app/scratch/test_endpoints.py

import os
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

# Mock environment variables if needed
if not os.getenv("MONGO_URI"):
    os.environ["MONGO_URI"] = "mongodb://localhost:27017"
if not os.getenv("DB_NAME"):
    os.environ["DB_NAME"] = "test_db"
if not os.getenv("GROQ_API_KEY"):
    os.environ["GROQ_API_KEY"] = "mock_key"
if not os.getenv("JWT_SECRET"):
    os.environ["JWT_SECRET"] = "mock_secret"

try:
    from app import app
    print("Flask app compiles and imports successfully!\n")
except Exception as e:
    print("Flask app import failed with exception:", e)
    sys.exit(1)

client = app.test_client()

print("Verifying backend routes compile and initialize correctly...")

# Check registered routes
routes = [str(rule) for rule in app.url_map.iter_rules()]
required_routes = [
    "/register", "/login", "/verify-otp", "/student/dashboard", 
    "/courses/available", "/notes/analyze", "/resume/analyze",
    "/ai-tutor/chat", "/prompt-game/evaluate", "/admin/stats"
]

all_passed = True
print("Registered Routes Check:")
for r in required_routes:
    match = any(r in rt for rt in routes)
    print(f"  {r}: {'PASSED' if match else 'FAILED'}")
    if not match:
        all_passed = False

print("\nRunning smoke tests on basic GET endpoints...")

# 1. GET /courses/available
try:
    res = client.get("/courses/available?email=test@test.com")
    print(f"  GET /courses/available status: {res.status_code} (Expected: 200)")
    if res.status_code != 200:
        all_passed = False
except Exception as e:
    print("  GET /courses/available failed with exception:", e)
    all_passed = False

# 2. GET /notifications
try:
    res = client.get("/notifications?email=test@test.com&role=student")
    print(f"  GET /notifications status: {res.status_code} (Expected: 200)")
    if res.status_code != 200:
        all_passed = False
except Exception as e:
    print("  GET /notifications failed with exception:", e)
    all_passed = False

# 3. GET /admin/stats
try:
    res = client.get("/admin/stats")
    print(f"  GET /admin/stats status: {res.status_code} (Expected: 200)")
    if res.status_code != 200:
        all_passed = False
except Exception as e:
    print("  GET /admin/stats failed with exception:", e)
    all_passed = False

if all_passed:
    print("\nAll compilation and smoke verification checks PASSED!")
    sys.exit(0)
else:
    print("\nSome verification checks FAILED!")
    sys.exit(1)
