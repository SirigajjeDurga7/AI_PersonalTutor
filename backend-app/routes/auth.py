from flask import Blueprint, request, jsonify, current_app
from pymongo import MongoClient
from dotenv import load_dotenv
from flask_mail import Message
from bson import ObjectId
from groq import Groq
import json
from datetime import datetime, timedelta
import os
import bcrypt
import random
import jwt
from pathlib import Path

# Load environment variables
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

auth_bp = Blueprint("auth", __name__)

# MongoDB Connection
client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("DB_NAME")]

users = db["users"]
otp_collection = db["otp_codes"]
courses = db["courses"]
tasks_col = db["tasks"]
quizzes = db["quizzes"]
study_tasks = db["study_tasks"]
groq_client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

study_plans = db["study_plans"]
# ================= REGISTER =================
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    full_name = data.get("fullName")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role")

    if not all([full_name, email, password, role]):
        return jsonify({
            "message": "All fields are required"
        }), 400

    existing_user = users.find_one({"email": email})

    if existing_user:
        return jsonify({
            "message": "Account already exists"
        }), 409

    hashed_password = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    )

    users.insert_one({
        "fullName": full_name,
        "email": email,
        "password": hashed_password,
        "role": role
    })

    return jsonify({
        "message": "Registration successful"
    }), 201


# ================= LOGIN =================
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    user = users.find_one({"email": email})

    if not user:
        return jsonify({
            "message": "Account does not exist"
        }), 404

    if user.get("blocked", False):
        return jsonify({
            "message": "Your account has been blocked by the Administrator."
        }), 403

    if not bcrypt.checkpw(
        password.encode("utf-8"),
        user["password"]
    ):
        return jsonify({
            "message": "Invalid password"
        }), 401

    # Generate OTP
    otp = str(random.randint(100000, 999999))

    # Remove old OTPs
    otp_collection.delete_many({"email": email})

    # Store new OTP
    otp_collection.insert_one({
        "email": email,
        "otp": otp
    })

    print(f"OTP for {email}: {otp}")

    # Send OTP via Brevo
    msg = Message(
        subject="Lumina Login OTP",
        recipients=[email]
    )

    msg.body = f"""
Hello,

Your Lumina OTP is:

{otp}

This OTP is valid for 5 minutes.

Regards,
Lumina AI Tutor
"""

    try:
        current_app.mail.send(msg)

    except Exception as e:
        print("Email Error:", e)

        return jsonify({
            "message": f"Failed to send OTP: {str(e)}"
        }), 500

    return jsonify({
        "message": "OTP sent successfully"
    }), 200


# ================= VERIFY OTP =================
@auth_bp.route("/verify-otp", methods=["POST"])
def verify_otp():
    data = request.get_json()

    email = data.get("email")
    otp = data.get("otp")

    otp_doc = otp_collection.find_one({
        "email": email,
        "otp": otp
    })

    if not otp_doc:
        return jsonify({
            "message": "Invalid OTP"
        }), 400

    user = users.find_one({"email": email})

    if not user:
        return jsonify({
            "message": "User not found"
        }), 404

    if user.get("blocked", False):
        return jsonify({
            "message": "Your account has been blocked by the Administrator."
        }), 403

    token = jwt.encode(
        {
            "email": email,
            "role": user["role"],
            "exp": datetime.utcnow()
+ timedelta(hours=24)
        },
        os.getenv("JWT_SECRET"),
        algorithm="HS256"
    )

    # Delete OTP after successful verification
    otp_collection.delete_many({
        "email": email
    })

    return jsonify({
    "message": "Login successful",
    "token": token,
    "role": user["role"],
    "fullName": user["fullName"]
}), 200
@auth_bp.route("/student/dashboard", methods=["GET"])
def student_dashboard():

    email = request.args.get("email")

    user = users.find_one({"email": email})

    if not user:
        return jsonify({"message": "User not found"}), 404

    enrollments = db["enrollments"]
    active_enrollments = list(enrollments.find({"studentEmail": email}))
    enrolled_courses = []

    for enroll in active_enrollments:
        try:
            course_id_obj = ObjectId(enroll["courseId"])
        except Exception:
            continue
        
        c = courses.find_one({"_id": course_id_obj})
        if c:
            # Calculate dynamic progress based on submodules
            total_submods = 0
            for m in c.get("modules", []):
                total_submods += len(m.get("submodules", []))
                
            completed_submods = 0
            sub_progress = enroll.get("submoduleProgress", {})
            for sub_id, sub_info in sub_progress.items():
                if sub_info.get("status") == "Completed":
                    completed_submods += 1
            
            if total_submods > 0:
                progress = round((completed_submods / total_submods) * 100)
            else:
                progress = 100 if enroll.get("status") == "Completed" else 0
                
            enrolled_courses.append({
                "courseId": str(c["_id"]),
                "courseName": c.get("courseName"),
                "level": c.get("level"),
                "instructorName": c.get("instructorName"),
                "duration": c.get("duration"),
                "color": c.get("color"),
                "status": enroll.get("status", "In Progress"),
                "progress": progress
            })

    active_courses_count = sum(1 for c in enrolled_courses if c["status"] != "Completed")

    recent_quizzes = list(
        quizzes.find(
            {"studentEmail": email},
            {"_id": 0}
        ).limit(2)
    )

    completed_tasks = study_tasks.count_documents({
        "studentEmail": email,
        "status": "Completed"
    })

    avg_score = 0

    if recent_quizzes:
        avg_score = round(
            sum(q["score"] for q in recent_quizzes)
            / len(recent_quizzes)
        )

    return jsonify({
        "fullName": user["fullName"],
        "stats": {
            "activeCourses": active_courses_count,
            "studyHours": completed_tasks * 2,
            "streak": completed_tasks,
            "avgQuizScore": avg_score
        },
        "courses": enrolled_courses,
        "quizzes": recent_quizzes
    }), 200
@auth_bp.route("/tasks", methods=["POST"])
def add_task():

    data = request.get_json()

    task = {
        "studentEmail": data["studentEmail"],
        "title": data["title"],
        "course": data["course"],
        "priority": data["priority"],
        "date": data["date"],
        "day": data["day"],
        "startTime": data["startTime"],
        "endTime": data["endTime"],
        "status": "Pending"
    }

    study_tasks.insert_one(task)

    return jsonify({
        "message": "Task added successfully"
    }), 201
@auth_bp.route("/tasks/today", methods=["GET"])
def get_today_tasks():

    email = request.args.get("email")
    date = request.args.get("date")

    tasks = list(
        study_tasks.find(
            {
                "studentEmail": email,
                "date": date
            }
        )
    )

    for task in tasks:
        task["_id"] = str(task["_id"])

    return jsonify(tasks), 200
@auth_bp.route("/generate-study-plan", methods=["POST"])
def generate_study_plan():
    data = request.get_json()

    email = data["email"]
    course = data["course"]
    goal = data["goal"]
    deadline = data["deadline"]
    daily_hours = int(data["dailyHours"])
    start_date_str = data.get("startDate", "")
    learning_level = data.get("learningLevel", "Beginner")

    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        except ValueError:
            start_date = datetime.today()
    else:
        start_date = datetime.today()

    prompt = f"""
You are an expert tutor. Create a realistic, highly personalized study roadmap for a student.

Input Details:
- Course/Subject Name: {course}
- Study Goal/Target: {goal}
- Start Date: {start_date.strftime('%Y-%m-%d')}
- End Date/Deadline: {deadline}
- Daily Study Duration: {daily_hours} hours/day
- Learning Level: {learning_level}

Return ONLY a JSON array of objects representing daily study tasks.
Each object in the array must have the following structure:
{{
  "topic": "The main topic or subject to study on this day",
  "timeAllocation": "{daily_hours} hours",
  "dailyTask": "A specific action-oriented daily task or exercise to complete",
  "milestone": "A brief milestone statement if this day completes a major milestone (e.g., 'Milestone 1: Fundamentals Mastered'), otherwise empty string ''"
}}

Example output:
[
  {{
    "topic": "Python Variables and Operators",
    "timeAllocation": "2 hours",
    "dailyTask": "Read docs on variables, write 5 basic scripts with arithmetic operations.",
    "milestone": ""
  }},
  {{
    "topic": "Control Flow in Python",
    "timeAllocation": "2 hours",
    "dailyTask": "Write condition blocks and nested loop exercises.",
    "milestone": "Milestone 1: Basic Control flow logic completed"
  }}
]

Return only the raw JSON array. Do not wrap in markdown or include extra text.
"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3
        )

        content = response.choices[0].message.content.strip()
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        topics = json.loads(content)

    except Exception as e:
        return jsonify({
            "message": f"AI generation failed: {str(e)}"
        }), 500

    generated_tasks = []

    for i, topic in enumerate(topics):
        generated_tasks.append({
            "date": (start_date + timedelta(days=i)).strftime("%Y-%m-%d"),
            "topic": topic.get("topic", ""),
            "timeAllocation": topic.get("timeAllocation", f"{daily_hours} hours"),
            "dailyTask": topic.get("dailyTask", ""),
            "milestone": topic.get("milestone", ""),
            "completed": False
        })

    study_plans.delete_many({
        "studentEmail": email,
        "course": course
    })

    study_plans.insert_one({
        "studentEmail": email,
        "course": course,
        "goal": goal,
        "startDate": start_date.strftime("%Y-%m-%d"),
        "deadline": deadline,
        "dailyHours": daily_hours,
        "learningLevel": learning_level,
        "generatedTasks": generated_tasks
    })

    return jsonify(generated_tasks), 200


@auth_bp.route("/tasks/<task_id>", methods=["PUT"])
def update_task(task_id):

    data = request.get_json()

    study_tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {
                "title": data["title"],
                "course": data["course"],
                "priority": data["priority"],
                "date": data["date"],
                "day": data["day"],
                "startTime": data["startTime"],
                "endTime": data["endTime"]
            }
        }
    )

    return jsonify({
        "message": "Task updated successfully"
    }), 200
@auth_bp.route("/tasks/<task_id>/complete", methods=["PUT"])
def complete_task(task_id):

    study_tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {
                "status": "Completed"
            }
        }
    )

    return jsonify({
        "message": "Task completed"
    }), 200
@auth_bp.route("/tasks/<task_id>", methods=["DELETE"])
def delete_task(task_id):

    study_tasks.delete_one({
        "_id": ObjectId(task_id)
    })

    return jsonify({
        "message": "Task deleted"
    }), 200
@auth_bp.route("/study-plan", methods=["GET"])
def get_study_plan():

    email = request.args.get("email")

    plan = study_plans.find_one(
        {"studentEmail": email},
        {"_id": 0}
    )

    if not plan:
        return jsonify({
            "message": "No study plan found"
        }), 404

    return jsonify(plan), 200
@auth_bp.route(
    "/study-plan/complete",
    methods=["PUT"]
)
def complete_study_topic():

    data = request.get_json()

    email = data["email"]
    course = data["course"]
    index = data["index"]

    study_plans.update_one(
        {
            "studentEmail": email,
            "course": course
        },
        {
            "$set": {
                f"generatedTasks.{index}.completed": True
            }
        }
    )

    return jsonify({
        "message": "Topic marked complete"
    }), 200
@auth_bp.route("/study-plan", methods=["DELETE"])
def delete_study_plan():

    email = request.args.get("email")
    course = request.args.get("course")

    study_plans.delete_one({
        "studentEmail": email,
        "course": course
    })

    return jsonify({
        "message": "Study plan deleted"
    }), 200
