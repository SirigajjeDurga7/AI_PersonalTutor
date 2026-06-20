# backend-app/routes/lms.py

from flask import Blueprint, request, jsonify, current_app
from pymongo import MongoClient
from bson import ObjectId
from groq import Groq
from flask_mail import Message
import json
from datetime import datetime, timedelta
import os
import random
import PyPDF2
import docx
import io
import uuid

lms_bp = Blueprint("lms", __name__)

# MongoDB Connection
client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("DB_NAME")]

users = db["users"]
courses = db["courses"]
enrollments = db["enrollments"]
study_tasks = db["study_tasks"]
study_plans = db["study_plans"]
quizzes = db["quizzes"]
notes = db["notes"]
prompt_games = db["prompt_games"]
notifications = db["notifications"]

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Helper: Clean LLM JSON response
def clean_llm_json(content):
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    return content.strip()

# Helper: Extract text from file bytes
def extract_text_from_file(file_bytes, filename):
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf":
        pdf_file = io.BytesIO(file_bytes)
        reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text
    elif ext == ".docx":
        doc_file = io.BytesIO(file_bytes)
        doc = docx.Document(doc_file)
        text = []
        for para in doc.paragraphs:
            text.append(para.text)
        return "\n".join(text)
    else:
        # Default as txt/utf-8
        return file_bytes.decode("utf-8", errors="ignore")

# ================= COURSES MODULE =================

@lms_bp.route("/courses/available", methods=["GET"])
def get_available_courses():
    email = request.args.get("email")
    search_query = request.args.get("search", "")

    query = {"published": True}
    if search_query:
        query["$or"] = [
            {"courseName": {"$regex": search_query, "$options": "i"}},
            {"description": {"$regex": search_query, "$options": "i"}}
        ]
    
    all_courses = list(courses.find(query))
    
    # Map status for this specific student
    results = []
    for c in all_courses:
        c["_id"] = str(c["_id"])
        
        enrollment = enrollments.find_one({
            "studentEmail": email,
            "courseId": c["_id"]
        })
        
        c["enrollmentStatus"] = enrollment["status"] if enrollment else "Not Enrolled"
        c["quizScore"] = enrollment.get("quizScore") if enrollment else None
        c["deadline"] = enrollment.get("deadline") if enrollment else None
        
        # Calculate average rating
        ratings = c.get("ratings", [])
        if ratings:
            c["avgRating"] = round(sum(r["rating"] for r in ratings) / len(ratings), 1)
        else:
            c["avgRating"] = 0
            
        results.append(c)
        
    return jsonify(results), 200

@lms_bp.route("/courses/<course_id>/enroll", methods=["POST"])
def enroll_course(course_id):
    data = request.get_json()
    email = data.get("email")
    
    existing = enrollments.find_one({"studentEmail": email, "courseId": course_id})
    if existing:
        return jsonify({"message": "Already enrolled"}), 400
        
    enrollments.insert_one({
        "studentEmail": email,
        "courseId": course_id,
        "status": "In Progress",
        "enrollmentDate": datetime.today().strftime("%Y-%m-%d"),
        "completionDate": None,
        "quizScore": None,
        "deadline": None
    })
    
    return jsonify({"message": "Enrolled successfully"}), 201

@lms_bp.route("/courses/<course_id>", methods=["GET"])
def get_course_details(course_id):
    email = request.args.get("email")
    c = courses.find_one({"_id": ObjectId(course_id)})
    if not c:
        return jsonify({"message": "Course not found"}), 404
        
    c["_id"] = str(c["_id"])
    
    if email:
        enrollment = enrollments.find_one({"studentEmail": email, "courseId": course_id})
        if enrollment:
            c["enrollmentStatus"] = enrollment.get("status", "In Progress")
            c["submoduleProgress"] = enrollment.get("submoduleProgress", {})
            c["quizScore"] = enrollment.get("quizScore")
        else:
            c["enrollmentStatus"] = "Not Enrolled"
            c["submoduleProgress"] = {}
            c["quizScore"] = None
            
    return jsonify(c), 200

@lms_bp.route("/courses/<course_id>/comments", methods=["POST"])
def add_course_comment(course_id):
    data = request.get_json()
    student_email = data.get("email")
    student_name = data.get("fullName")
    text = data.get("text")
    
    comment = {
        "id": str(uuid.uuid4()),
        "studentName": student_name,
        "studentEmail": student_email,
        "text": text,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "replies": []
    }
    
    courses.update_one(
        {"_id": ObjectId(course_id)},
        {"$push": {"comments": comment}}
    )
    
    return jsonify(comment), 200

@lms_bp.route("/courses/<course_id>/comments/<comment_id>/reply", methods=["POST"])
def reply_course_comment(course_id, comment_id):
    data = request.get_json()
    instructor_name = data.get("fullName")
    text = data.get("text")
    
    reply = {
        "instructorName": instructor_name,
        "text": text,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M")
    }
    
    # Locate the comment and push to its replies array
    courses.update_one(
        {"_id": ObjectId(course_id), "comments.id": comment_id},
        {"$push": {"comments.$.replies": reply}}
    )
    
    return jsonify(reply), 200

@lms_bp.route("/courses/<course_id>/ratings", methods=["POST"])
def add_course_rating(course_id):
    data = request.get_json()
    email = data.get("email")
    rating = int(data.get("rating"))
    feedback = data.get("feedback", "")
    
    review = {
        "studentEmail": email,
        "rating": rating,
        "feedback": feedback
    }
    
    # Remove older review by same student if it exists
    courses.update_one(
        {"_id": ObjectId(course_id)},
        {"$pull": {"ratings": {"studentEmail": email}}}
    )
    
    courses.update_one(
        {"_id": ObjectId(course_id)},
        {"$push": {"ratings": review}}
    )
    
    return jsonify({"message": "Review submitted"}), 200

@lms_bp.route("/courses/<course_id>/quiz/submit", methods=["POST"])
def submit_course_quiz(course_id):
    data = request.get_json()
    email = data.get("email")
    score = int(data.get("score"))  # percentage
    
    enrollment = enrollments.find_one({"studentEmail": email, "courseId": course_id})
    if not enrollment:
        return jsonify({"message": "Enrollment not found"}), 404
        
    passed = score >= 60
    
    # Check submodules completion
    course_doc = courses.find_one({"_id": ObjectId(course_id)})
    total_submods = 0
    if course_doc:
        for m in course_doc.get("modules", []):
            total_submods += len(m.get("submodules", []))
            
    completed_submods = 0
    sub_progress = enrollment.get("submoduleProgress", {})
    for sub_id, sub_info in sub_progress.items():
        if sub_info.get("status") == "Completed":
            completed_submods += 1
            
    all_submods_completed = completed_submods >= total_submods if total_submods > 0 else True
    
    should_complete = passed and all_submods_completed
    status = "Completed" if should_complete else "In Progress"
    completion_date = datetime.today().strftime("%Y-%m-%d") if should_complete else None
    
    enrollments.update_one(
        {"studentEmail": email, "courseId": course_id},
        {
            "$set": {
                "status": status,
                "quizScore": score,
                "completionDate": completion_date
            }
        }
    )

@lms_bp.route("/courses/<course_id>/submodules/<submodule_id>/start", methods=["POST"])
def start_submodule(course_id, submodule_id):
    data = request.get_json()
    email = data.get("email")
    
    enrollment = enrollments.find_one({"studentEmail": email, "courseId": course_id})
    if not enrollment:
        return jsonify({"message": "Enrollment not found"}), 404
        
    current_time = datetime.utcnow().isoformat() + "Z"
    
    enrollments.update_one(
        {"studentEmail": email, "courseId": course_id},
        {"$set": {f"submoduleProgress.{submodule_id}": {
            "startTime": current_time,
            "status": "In Progress"
        }}}
    )
    return jsonify({"message": "Submodule started"}), 200

@lms_bp.route("/courses/<course_id>/submodules/<submodule_id>/complete", methods=["POST"])
def complete_submodule(course_id, submodule_id):
    data = request.get_json()
    email = data.get("email")
    
    enrollment = enrollments.find_one({"studentEmail": email, "courseId": course_id})
    if not enrollment:
        return jsonify({"message": "Enrollment not found"}), 404
        
    sub_progress = enrollment.get("submoduleProgress", {}).get(submodule_id)
    if not sub_progress:
        return jsonify({"message": "Submodule has not been started"}), 400
        
    course_doc = courses.find_one({"_id": ObjectId(course_id)})
    if not course_doc:
        return jsonify({"message": "Course not found"}), 404
        
    submodule = None
    for m in course_doc.get("modules", []):
        for s in m.get("submodules", []):
            if s.get("id") == submodule_id:
                submodule = s
                break
        if submodule:
            break
            
    if not submodule:
        return jsonify({"message": "Submodule not found in course"}), 404
        
    start_time_str = sub_progress.get("startTime")
    if not start_time_str:
        return jsonify({"message": "Start time not recorded"}), 400
        
    try:
        start_time = datetime.fromisoformat(start_time_str.replace("Z", ""))
    except Exception:
        start_time = datetime.utcnow()
        
    duration_minutes = int(submodule.get("duration", 0))
    elapsed = datetime.utcnow() - start_time
    
    if elapsed < timedelta(minutes=duration_minutes):
        remaining_sec = duration_minutes * 60 - elapsed.total_seconds()
        return jsonify({
            "message": "Required duration has not elapsed yet",
            "eligible": False,
            "remainingSeconds": max(0, int(remaining_sec))
        }), 400
        
    current_time = datetime.utcnow().isoformat() + "Z"
    enrollments.update_one(
        {"studentEmail": email, "courseId": course_id},
        {"$set": {
            f"submoduleProgress.{submodule_id}.status": "Completed",
            f"submoduleProgress.{submodule_id}.completionTime": current_time
        }}
    )
    
    enrollment = enrollments.find_one({"studentEmail": email, "courseId": course_id})
    
    total_submods = 0
    for m in course_doc.get("modules", []):
        total_submods += len(m.get("submodules", []))
        
    completed_submods = 0
    sub_progress_dict = enrollment.get("submoduleProgress", {})
    for sub_id, sub_info in sub_progress_dict.items():
        if sub_info.get("status") == "Completed":
            completed_submods += 1
            
    all_submods_completed = completed_submods >= total_submods if total_submods > 0 else True
    
    quiz_passed = True
    if course_doc.get("quiz", {}).get("questions"):
        quiz_passed = enrollment.get("quizScore", 0) >= 60
        
    if all_submods_completed and quiz_passed:
        enrollments.update_one(
            {"studentEmail": email, "courseId": course_id},
            {"$set": {
                "status": "Completed",
                "completionDate": datetime.today().strftime("%Y-%m-%d")
            }}
        )
        return jsonify({"message": "Submodule marked completed. Course Completed!", "courseCompleted": True}), 200
        
    return jsonify({"message": "Submodule marked completed", "courseCompleted": False}), 200
    
    # Save to global quizzes log
    course_doc = courses.find_one({"_id": ObjectId(course_id)})
    quizzes.insert_one({
        "studentEmail": email,
        "title": f"Course Assessment: {course_doc['courseName']}",
        "subject": course_doc["courseName"],
        "score": score,
        "date": datetime.today().strftime("%Y-%m-%d"),
        "type": "course"
    })
    
    # Award streak update logic on activity completion
    today_str = datetime.today().strftime("%Y-%m-%d")
    user = users.find_one({"email": email})
    if user:
        last_date = user.get("lastActiveDate")
        streak = user.get("streak", 0)
        if last_date != today_str:
            if last_date == (datetime.today() - timedelta(days=1)).strftime("%Y-%m-%d"):
                streak += 1
            else:
                streak = 1
            users.update_one(
                {"email": email},
                {"$set": {"streak": streak, "lastActiveDate": today_str}}
            )
            
    return jsonify({
        "passed": passed,
        "message": f"Quiz submitted. You {'passed!' if passed else 'failed. Try again.'}"
    }), 200

# ================= INSTRUCTOR COURSE MANAGEMENT =================

@lms_bp.route("/courses", methods=["POST"])
def create_course():
    data = request.get_json()
    course_name = data.get("courseName")
    description = data.get("description")
    instructor_email = data.get("email")
    instructor_name = data.get("fullName")
    duration = data.get("duration", "4 weeks")
    level = data.get("level", "Beginner")
    
    colors = ["#4F46E5", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#8B5CF6"]
    color = random.choice(colors)
    
    course_id = courses.insert_one({
        "courseName": course_name,
        "description": description,
        "instructorEmail": instructor_email,
        "instructorName": instructor_name,
        "duration": duration,
        "level": level,
        "published": True,
        "completed": False,
        "color": color,
        "modules": [],
        "quiz": {"questions": []},
        "comments": [],
        "ratings": []
    }).inserted_id
    
    return jsonify({
        "message": "Course created",
        "courseId": str(course_id)
    }), 201

@lms_bp.route("/courses/<course_id>", methods=["PUT"])
def update_course(course_id):
    data = request.get_json()
    courses.update_one(
        {"_id": ObjectId(course_id)},
        {"$set": {
            "courseName": data.get("courseName"),
            "description": data.get("description"),
            "duration": data.get("duration"),
            "level": data.get("level"),
            "modules": data.get("modules", []),
            "completed": data.get("completed", False)
        }}
    )
    return jsonify({"message": "Course updated"}), 200

@lms_bp.route("/courses/<course_id>", methods=["DELETE"])
def delete_course(course_id):
    courses.delete_one({"_id": ObjectId(course_id)})
    enrollments.delete_many({"courseId": course_id})
    return jsonify({"message": "Course deleted"}), 200

@lms_bp.route("/courses/<course_id>/generate-quiz", methods=["POST"])
def generate_course_quiz(course_id):
    course = courses.find_one({"_id": ObjectId(course_id)})
    if not course:
        return jsonify({"message": "Course not found"}), 404
        
    modules_desc = "\n".join([f"- {m['title']}: {m['description']}" for m in course.get("modules", [])])
    prompt = f"""
Create a 5-question multiple choice assessment quiz for a course based on its details.
Course: {course['courseName']}
Description: {course['description']}
Modules:
{modules_desc}

Return ONLY a JSON object formatted exactly as:
{{
  "questions": [
    {{
      "question": "question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correctIndex": 0
    }}
  ]
}}

Do not include any wrapping markdown formatting like ```json or anything else. Just valid parsed JSON content.
"""
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        content = clean_llm_json(response.choices[0].message.content)
        quiz_data = json.loads(content)
        
        courses.update_one(
            {"_id": ObjectId(course_id)},
            {"$set": {"quiz": quiz_data}}
        )
        
        return jsonify(quiz_data), 200
    except Exception as e:
        return jsonify({"message": f"AI Generation failed: {str(e)}"}), 500

@lms_bp.route("/instructor/courses", methods=["GET"])
def get_instructor_courses():
    email = request.args.get("email")
    instructor_courses = list(courses.find({"instructorEmail": email}))
    
    for c in instructor_courses:
        c["_id"] = str(c["_id"])
        c["enrolledCount"] = enrollments.count_documents({"courseId": c["_id"]})
        
        # Calculate rating
        ratings = c.get("ratings", [])
        if ratings:
            c["avgRating"] = round(sum(r["rating"] for r in ratings) / len(ratings), 1)
        else:
            c["avgRating"] = 0
            
    return jsonify(instructor_courses), 200

# ================= NOTES MODULE (AI SUMMARIZATION) =================

@lms_bp.route("/notes/analyze", methods=["POST"])
def analyze_notes():
    email = request.form.get("email")
    if "file" not in request.files:
        return jsonify({"message": "No file uploaded"}), 400
        
    file = request.files["file"]
    file_bytes = file.read()
    filename = file.filename
    
    try:
        text = extract_text_from_file(file_bytes, filename)
    except Exception as e:
        return jsonify({"message": f"Failed to extract document text: {str(e)}"}), 400
        
    if not text.strip():
        return jsonify({"message": "Document is empty or text extraction failed."}), 400
        
    prompt = f"""
You are an expert academic tutor.
Analyze the following document text and output a JSON object containing:
1. "summary": A detailed summary of the main topics in markdown format.
2. "questions": An array of 5 key questions and their detailed answers based on the content. Format each as: {{"question": "...", "answer": "..."}}
3. "cheatSheet": A concise cheat sheet containing key definitions, formulas, and concepts in markdown format.

Do not include any text before or after the JSON. Return only the JSON object.

Document text (capped):
{text[:8000]}
"""
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        content = clean_llm_json(response.choices[0].message.content)
        analysis = json.loads(content)
        
        note_doc = {
            "studentEmail": email,
            "fileName": filename,
            "summary": analysis.get("summary", ""),
            "questions": analysis.get("questions", []),
            "cheatSheet": analysis.get("cheatSheet", ""),
            "uploadedAt": datetime.now().strftime("%Y-%m-%d %H:%M")
        }
        
        notes.insert_one(note_doc)
        note_doc["_id"] = str(note_doc["_id"])
        
        return jsonify(note_doc), 200
    except Exception as e:
        return jsonify({"message": f"AI Summarization failed: {str(e)}"}), 500

@lms_bp.route("/notes", methods=["GET"])
def get_notes():
    email = request.args.get("email")
    student_notes = list(notes.find({"studentEmail": email}))
    for n in student_notes:
        n["_id"] = str(n["_id"])
    return jsonify(student_notes), 200

# ================= RESUME ANALYSIS & MOCK INTERVIEW =================

@lms_bp.route("/resume/analyze", methods=["POST"])
def analyze_resume():
    email = request.form.get("email")
    jd_text = request.form.get("jobDescription", "")
    
    if "file" not in request.files:
        return jsonify({"message": "No resume file uploaded"}), 400
        
    file = request.files["file"]
    file_bytes = file.read()
    filename = file.filename
    
    try:
        resume_text = extract_text_from_file(file_bytes, filename)
    except Exception as e:
        return jsonify({"message": f"Failed to read resume file: {str(e)}"}), 400
        
    prompt = f"""
You are an expert ATS (Applicant Tracking System) parser and career coach.
Analyze the student's resume against the Job Description.

Resume Text:
{resume_text[:6000]}

Job Description:
{jd_text[:4000]}

Return a JSON object containing:
1. "atsScore": A number from 0 to 100 indicating match quality.
2. "missingKeywords": A JSON array of key skills/keywords missing from the resume.
3. "improvements": A JSON array of bulleted feedback for modifying the resume.
4. "realtimeFeedback": A brief general summary paragraph of career advice.

Do not include any text before or after the JSON.
"""
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        content = clean_llm_json(response.choices[0].message.content)
        analysis = json.loads(content)
        return jsonify(analysis), 200
    except Exception as e:
        return jsonify({"message": f"ATS Analysis failed: {str(e)}"}), 500

@lms_bp.route("/resume/mock-interview/generate", methods=["POST"])
def generate_mock_interview():
    data = request.get_json()
    resume_text = data.get("resumeText", "General IT resume")
    jd_text = data.get("jobDescription", "Software engineer role")
    
    prompt = f"""
Generate 5 custom technical and behavioral interview questions based on the candidate's resume and target Job Description.
Resume:
{resume_text[:2000]}
JD:
{jd_text[:2000]}

Return ONLY a JSON array of strings containing the questions, e.g. ["Q1?", "Q2?", ...]
"""
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4
        )
        content = clean_llm_json(response.choices[0].message.content)
        questions = json.loads(content)
        return jsonify(questions), 200
    except Exception as e:
        return jsonify(["Tell me about a challenging technical project you worked on.",
                        "What is your experience with databases and API design?",
                        "How do you handle disagreement with team members?",
                        "Explain the concept of OOP in your own words.",
                        "Why do you want to join our organization?"]), 200

@lms_bp.route("/resume/mock-interview/evaluate", methods=["POST"])
def evaluate_mock_interview():
    data = request.get_json()
    interview_log = data.get("log")  # Array of {question: str, answer: str}
    
    log_text = "\n".join([f"Q: {item['question']}\nA: {item['answer']}" for item in interview_log])
    prompt = f"""
Evaluate the candidate's answers in a mock interview.
Interview transcript:
{log_text}

Return ONLY a JSON object containing:
1. "technicalSkills": rating out of 100
2. "confidence": rating out of 100
3. "communication": rating out of 100
4. "clarity": rating out of 100
5. "overallPerformance": score out of 100
6. "suggestions": JSON array of constructive feedback.
7. "recommendations": JSON array of next steps.

Do not include any text before or after the JSON.
"""
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        content = clean_llm_json(response.choices[0].message.content)
        evaluation = json.loads(content)
        return jsonify(evaluation), 200
    except Exception as e:
        return jsonify({"message": f"Evaluation failed: {str(e)}"}), 500

# ================= QUIZZES GENERATION MODULE =================

@lms_bp.route("/quizzes/generate", methods=["POST"])
def generate_ai_quiz():
    data = request.get_json()
    topic = data.get("topic", "")
    doc_text = data.get("documentText", "")
    
    source = topic if topic else "Uploaded Document"
    context = doc_text if doc_text else topic
    
    prompt = f"""
Create a 5-question multiple choice quiz on the following topic or document context.
Context: {context[:5000]}

Return ONLY a JSON object:
{{
  "title": "Quiz on {source[:30]}",
  "questions": [
    {{
      "question": "question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correctIndex": 0
    }}
  ]
}}
Do not include any markdown or text wraps. Just raw JSON.
"""
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        content = clean_llm_json(response.choices[0].message.content)
        quiz_data = json.loads(content)
        return jsonify(quiz_data), 200
    except Exception as e:
        return jsonify({"message": f"Quiz generation failed: {str(e)}"}), 500

@lms_bp.route("/quizzes/save", methods=["POST"])
def save_quiz_attempt():
    data = request.get_json()
    email = data.get("email")
    title = data.get("title")
    subject = data.get("subject")
    score = int(data.get("score"))
    
    quizzes.insert_one({
        "studentEmail": email,
        "title": title,
        "subject": subject,
        "score": score,
        "date": datetime.today().strftime("%Y-%m-%d"),
        "type": "custom"
    })
    return jsonify({"message": "Quiz scores saved"}), 200

@lms_bp.route("/quizzes/history", methods=["GET"])
def get_quiz_history():
    email = request.args.get("email")
    history = list(quizzes.find({"studentEmail": email}).sort("date", -1))
    for h in history:
        h["_id"] = str(h["_id"])
    return jsonify(history), 200

# ================= AI TUTOR CHATBOT =================

@lms_bp.route("/ai-tutor/chat", methods=["POST"])
def ai_tutor_chat():
    data = request.get_json()
    message = data.get("message")
    history = data.get("history", []) # array of {role: user/assistant, content: str}
    
    system_instruction = {
        "role": "system",
        "content": "You are Lumina, a warm, highly-knowledgeable AI Tutor. Explain complex topics using simple analogies, guide the student step-by-step, and clarify doubts immediately."
    }
    
    messages = [system_instruction]
    for h in history[-10:]: # keep context short
        messages.append({"role": h["role"], "content": h["content"]})
        
    messages.append({"role": "user", "content": message})
    
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.6
        )
        reply = response.choices[0].message.content
        return jsonify({"reply": reply}), 200
    except Exception as e:
        return jsonify({"reply": f"Sorry, I had an issue connecting to my brain. Details: {str(e)}"}), 500

# ================= PROMPT ENGINEERING GAME =================

@lms_bp.route("/prompt-game/evaluate", methods=["POST"])
def evaluate_game_prompt():
    data = request.get_json()
    email = data.get("email")
    ref_prompt = data.get("referencePrompt")
    student_prompt = data.get("studentPrompt")
    image_name = data.get("imageName", "")
    
    prompt = f"""
Compare the student's prompt with the reference prompt.
Reference Prompt: "{ref_prompt}"
Student Prompt: "{student_prompt}"

Return ONLY a JSON object containing:
1. "score": rating from 0 to 100 based on prompt details, triggers, styling tags, and clarity.
2. "similarity": similarity rating (0-100) between prompts.
3. "feedback": brief critique of what the student prompt is missing or did well.
4. "betterExample": an improved, optimized version of the student's prompt.

Do not write anything else. Just the JSON.
"""
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        content = clean_llm_json(response.choices[0].message.content)
        grading = json.loads(content)
        
        # Save game performance
        prompt_games.insert_one({
            "studentEmail": email,
            "referencePrompt": ref_prompt,
            "studentPrompt": student_prompt,
            "score": grading["score"],
            "similarity": grading["similarity"],
            "feedback": grading["feedback"],
            "betterExample": grading["betterExample"],
            "imageName": image_name,
            "date": datetime.today().strftime("%Y-%m-%d")
        })
        
        return jsonify(grading), 200
    except Exception as e:
        return jsonify({"message": f"AI grading failed: {str(e)}"}), 500

@lms_bp.route("/prompt-game/history", methods=["GET"])
def get_prompt_game_history():
    email = request.args.get("email")
    hist = list(prompt_games.find({"studentEmail": email}).sort("date", -1))
    for h in hist:
        h["_id"] = str(h["_id"])
    return jsonify(hist), 200

# ================= PROGRESS ANALYTICS =================

@lms_bp.route("/student/progress", methods=["GET"])
def get_student_progress():
    email = request.args.get("email")
    
    # 1. Course completions
    enrolled = enrollments.count_documents({"studentEmail": email})
    completed = enrollments.count_documents({"studentEmail": email, "status": "Completed"})
    
    # 2. Quiz history
    student_quizzes = list(quizzes.find({"studentEmail": email}))
    quiz_trend = [{"date": q["date"], "score": q["score"], "title": q["title"]} for q in student_quizzes]
    
    # 3. Learning streak
    user = users.find_one({"email": email})
    streak = user.get("streak", 0) if user else 0
    
    # 4. Planner completions
    total_planner_tasks = study_tasks.count_documents({"studentEmail": email})
    completed_planner_tasks = study_tasks.count_documents({"studentEmail": email, "status": "Completed"})
    
    # 5. Prompt game stats
    game_attempts = list(prompt_games.find({"studentEmail": email}))
    avg_prompt_score = round(sum(g["score"] for g in game_attempts) / len(game_attempts)) if game_attempts else 0
    
    return jsonify({
        "courseStats": {
            "enrolled": enrolled,
            "completed": completed,
            "completionRate": round((completed / enrolled * 100) if enrolled > 0 else 0)
        },
        "streak": streak,
        "quizTrend": quiz_trend,
        "plannerStats": {
            "total": total_planner_tasks,
            "completed": completed_planner_tasks,
            "completionRate": round((completed_planner_tasks / total_planner_tasks * 100) if total_planner_tasks > 0 else 0)
        },
        "promptGame": {
            "attempts": len(game_attempts),
            "averageScore": avg_prompt_score
        }
    }), 200

# ================= NOTIFICATIONS & INSTRUCTOR MESSAGES =================

@lms_bp.route("/notifications", methods=["GET"])
def get_student_notifications():
    email = request.args.get("email")
    role = request.args.get("role")
    
    role_group = f"all_{role}s"  # all_students or all_instructors
    
    notifs = list(notifications.find({
        "$or": [
            {"recipientEmail": email},
            {"recipientEmail": role_group},
            {"recipientEmail": "all"}
        ]
    }).sort("date", -1))
    
    for n in notifs:
        n["_id"] = str(n["_id"])
        
    return jsonify(notifs), 200

@lms_bp.route("/instructor/communication", methods=["POST"])
def instructor_communication():
    data = request.get_json()
    instructor_email = data.get("email")
    instructor_name = data.get("fullName")
    title = data.get("title")
    message_text = data.get("message")
    recipient = data.get("recipient")  # course_id, 'all_students', or 'all'
    
    # Identify recipient emails
    recipient_emails = []
    
    if recipient == "all" or recipient == "all_students":
        student_docs = list(users.find({"role": "student"}))
        recipient_emails = [s["email"] for s in student_docs]
        group_tag = "all_students"
    else:
        # course_id specific
        enrolls = list(enrollments.find({"courseId": recipient}))
        recipient_emails = [e["studentEmail"] for e in enrolls]
        group_tag = recipient
        
    # Store notifications in DB
    notifications.insert_one({
        "recipientEmail": group_tag,
        "senderName": instructor_name,
        "senderEmail": instructor_email,
        "title": title,
        "message": message_text,
        "date": datetime.today().strftime("%Y-%m-%d %H:%M"),
        "read": False
    })
    
    # Send emails via Brevo relay
    for email in recipient_emails:
        msg = Message(
            subject=f"[Lumina Announcement] {title}",
            recipients=[email]
        )
        msg.body = f"""
Hello,

Instructor {instructor_name} has posted a new announcement:

Title: {title}

Message:
{message_text}

Log in to Lumina to view course updates.

Regards,
Lumina LMS Team
"""
        try:
            current_app.mail.send(msg)
        except Exception as e:
            print("Announcement Email Send Failure:", e)
            
    return jsonify({"message": f"Announcement sent to {len(recipient_emails)} students."}), 201

# ================= STUDENT ACCESS DEADLINES & LISTING =================

@lms_bp.route("/instructor/students", methods=["GET"])
def get_instructor_students():
    email = request.args.get("email")
    
    # Find all courses created by this instructor
    instructor_courses = list(courses.find({"instructorEmail": email}))
    course_ids = [str(c["_id"]) for c in instructor_courses]
    
    # Find enrollments in these courses
    enrolls = list(enrollments.find({"courseId": {"$in": course_ids}}))
    
    student_list = []
    for e in enrolls:
        student_user = users.find_one({"email": e["studentEmail"]})
        course_doc = courses.find_one({"_id": ObjectId(e["courseId"])})
        
        if student_user and course_doc:
            student_list.append({
                "enrollmentId": str(e["_id"]),
                "studentName": student_user["fullName"],
                "studentEmail": student_user["email"],
                "courseName": course_doc["courseName"],
                "courseId": e["courseId"],
                "status": e["status"],
                "enrollmentDate": e["enrollmentDate"],
                "deadline": e.get("deadline"),
                "quizScore": e.get("quizScore")
            })
            
    return jsonify(student_list), 200

@lms_bp.route("/instructor/students/deadline", methods=["POST"])
def set_student_deadline():
    data = request.get_json()
    email = data.get("studentEmail")
    course_id = data.get("courseId")
    deadline = data.get("deadline") # date string
    
    enrollments.update_one(
        {"studentEmail": email, "courseId": course_id},
        {"$set": {"deadline": deadline}}
    )
    
    # Create notification
    notifications.insert_one({
        "recipientEmail": email,
        "senderName": "System Alert",
        "senderEmail": "system@lumina.ai",
        "title": "Course Deadline Updated",
        "message": f"An instructor has set a completion deadline of {deadline} for your course.",
        "date": datetime.today().strftime("%Y-%m-%d %H:%M"),
        "read": False
    })
    
    return jsonify({"message": "Deadline updated"}), 200

@lms_bp.route("/instructor/students/remove", methods=["POST"])
def remove_student_enrollment():
    data = request.get_json()
    email = data.get("studentEmail")
    course_id = data.get("courseId")
    
    enrollments.delete_one({"studentEmail": email, "courseId": course_id})
    return jsonify({"message": "Student enrollment removed successfully"}), 200

# ================= ADMIN USER MANAGEMENT =================

@lms_bp.route("/admin/stats", methods=["GET"])
def get_admin_stats():
    total_students = users.count_documents({"role": "student"})
    total_instructors = users.count_documents({"role": "instructor"})
    total_courses = courses.count_documents({})
    
    active_users = users.count_documents({"blocked": {"$ne": True}})
    blocked_users = users.count_documents({"blocked": True})
    
    # Course completion statistics
    total_enrolls = enrollments.count_documents({})
    completed_enrolls = enrollments.count_documents({"status": "Completed"})
    completion_rate = round(completed_enrolls / total_enrolls * 100) if total_enrolls > 0 else 0
    
    return jsonify({
        "studentsCount": total_students,
        "instructorsCount": total_instructors,
        "coursesCount": total_courses,
        "activeCount": active_users,
        "blockedCount": blocked_users,
        "completionRate": completion_rate
    }), 200

@lms_bp.route("/admin/users", methods=["GET"])
def get_admin_users():
    search_query = request.args.get("search", "")
    role_filter = request.args.get("role", "")
    
    query = {}
    if role_filter:
        query["role"] = role_filter
        
    if search_query:
        search_cond = [
            {"fullName": {"$regex": search_query, "$options": "i"}},
            {"email": {"$regex": search_query, "$options": "i"}}
        ]
        if role_filter:
            query = {"$and": [{"role": role_filter}, {"$or": search_cond}]}
        else:
            query["$or"] = search_cond + [{"role": {"$regex": search_query, "$options": "i"}}]
            
    all_users = list(users.find(query))
    for u in all_users:
        u["_id"] = str(u["_id"])
        # Clear out hashed password for safety
        if "password" in u:
            del u["password"]
            
    return jsonify(all_users), 200

@lms_bp.route("/admin/users", methods=["POST"])
def admin_create_user():
    data = request.get_json()
    full_name = data.get("fullName")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role")
    
    import bcrypt
    existing = users.find_one({"email": email})
    if existing:
        return jsonify({"message": "User email already exists"}), 409
        
    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    
    users.insert_one({
        "fullName": full_name,
        "email": email,
        "password": hashed_password,
        "role": role,
        "blocked": False,
        "streak": 0,
        "lastActiveDate": None
    })
    
    return jsonify({"message": "User created successfully"}), 201

@lms_bp.route("/admin/users/<user_id>", methods=["PUT"])
def admin_update_user(user_id):
    data = request.get_json()
    
    update_fields = {
        "fullName": data.get("fullName"),
        "role": data.get("role")
    }
    
    # If password is provided, rehash it
    password = data.get("password")
    if password:
        import bcrypt
        hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
        update_fields["password"] = hashed_password
        
    users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_fields}
    )
    
    return jsonify({"message": "User updated successfully"}), 200

@lms_bp.route("/admin/users/<user_id>", methods=["DELETE"])
def admin_delete_user(user_id):
    user = users.find_one({"_id": ObjectId(user_id)})
    if user:
        # Also clean up their enrollments/courses
        enrollments.delete_many({"studentEmail": user["email"]})
        study_tasks.delete_many({"studentEmail": user["email"]})
        study_plans.delete_many({"studentEmail": user["email"]})
        notes.delete_many({"studentEmail": user["email"]})
        quizzes.delete_many({"studentEmail": user["email"]})
        prompt_games.delete_many({"studentEmail": user["email"]})
        
    users.delete_one({"_id": ObjectId(user_id)})
    return jsonify({"message": "User deleted successfully"}), 200

@lms_bp.route("/admin/users/<user_id>/toggle-block", methods=["POST"])
def admin_toggle_block_user(user_id):
    user = users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    new_block_state = not user.get("blocked", False)
    users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"blocked": new_block_state}}
    )
    
    return jsonify({
        "message": f"User account has been {'blocked' if new_block_state else 'unblocked'} successfully.",
        "blocked": new_block_state
    }), 200

# ================= USER PREFERENCES =================

@lms_bp.route("/user/preferences", methods=["GET"])
def get_user_preferences():
    email = request.args.get("email")
    user = users.find_one({"email": email})
    if not user:
        return jsonify({}), 200
    prefs = user.get("preferences", {})
    return jsonify(prefs), 200

@lms_bp.route("/user/preferences", methods=["POST"])
def save_user_preferences():
    data = request.get_json()
    email = data.get("email")
    prefs = data.get("preferences", {})
    
    users.update_one(
        {"email": email},
        {"$set": {"preferences": prefs}},
        upsert=True
    )
    return jsonify({"message": "Preferences saved"}), 200

