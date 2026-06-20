// src/pages/InstructorDashboard.jsx

import "./InstructorDashboard.css";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { 
  BookOpen, Calendar, HelpCircle, Layers, PlusCircle, 
  Trash2, Send, Edit, MessageSquare, UserCheck, Clock, Award
} from "lucide-react";

const API_BASE = "http://localhost:8000";

function InstructorDashboard() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  const [currentTab, setCurrentTab] = useState("dashboard");
  const [coursesList, setCoursesList] = useState([]);
  const [stats, setStats] = useState({ totalCourses: 0, totalEnrolled: 0, avgRating: 0.0 });
  const [loading, setLoading] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!currentUser) {
      navigate("/");
    }
  }, []);

  // Stats loading
  useEffect(() => {
    if (!currentUser) return;
    fetchInstructorDashboard();
  }, [currentTab]);

  const fetchInstructorDashboard = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/instructor/courses`, {
        params: { email: currentUser.email }
      });
      setCoursesList(response.data);
      
      const count = response.data.length;
      const enrolled = response.data.reduce((acc, curr) => acc + (curr.enrolledCount || 0), 0);
      const ratingSum = response.data.reduce((acc, curr) => acc + (curr.avgRating || 0.0), 0.0);
      const avg = count > 0 ? roundRating(ratingSum / count) : 0.0;

      setStats({ totalCourses: count, totalEnrolled: enrolled, avgRating: avg });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const roundRating = (num) => Math.round(num * 10) / 10;

  // ================= COURSES CREATOR & MODULES =================
  const [courseForm, setCourseForm] = useState({ courseName: "", description: "", duration: "4 weeks", level: "Beginner" });
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState(null);
  
  // Modules management for selected course
  const [selectedManageCourse, setSelectedManageCourse] = useState(null);
  const [moduleForm, setModuleForm] = useState({ title: "", description: "", contentType: "pdf", contentUrl: "" });
  const [editingSubmodulesModId, setEditingSubmodulesModId] = useState(null);

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!courseForm.courseName.trim()) return;

    try {
      if (editingCourseId) {
        await axios.put(`${API_BASE}/courses/${editingCourseId}`, {
          ...courseForm,
          modules: selectedManageCourse?.modules || []
        });
        alert("Course updated!");
      } else {
        await axios.post(`${API_BASE}/courses`, {
          ...courseForm,
          email: currentUser.email,
          fullName: currentUser.fullName
        });
        alert("Course created!");
      }
      setShowCourseModal(false);
      setEditingCourseId(null);
      setCourseForm({ courseName: "", description: "", duration: "4 weeks", level: "Beginner" });
      fetchInstructorDashboard();
    } catch (error) {
      alert("Failed to save course.");
    }
  };

  const startEditCourse = (course) => {
    setEditingCourseId(course._id);
    setCourseForm({
      courseName: course.courseName,
      description: course.description,
      duration: course.duration,
      level: course.level
    });
    setSelectedManageCourse(course);
    setShowCourseModal(true);
  };

  const startManageModules = (course) => {
    setCourseForm({
      courseName: course.courseName,
      description: course.description,
      duration: course.duration,
      level: course.level
    });
    setSelectedManageCourse(course);
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm("Delete course permanently?")) return;
    try {
      await axios.delete(`${API_BASE}/courses/${courseId}`);
      fetchInstructorDashboard();
    } catch (e) {
      alert("Failed to delete course.");
    }
  };

  const handleAddModule = async (e) => {
    e.preventDefault();
    if (!moduleForm.title.trim()) return;

    const newModule = {
      id: Math.random().toString(36).substr(2, 9),
      ...moduleForm
    };

    const updatedModules = [...(selectedManageCourse.modules || []), newModule];
    try {
      await axios.put(`${API_BASE}/courses/${selectedManageCourse._id}`, {
        ...selectedManageCourse,
        modules: updatedModules
      });
      alert("Module added!");
      setModuleForm({ title: "", description: "", contentType: "pdf", contentUrl: "" });
      
      // Update local state
      const refreshed = { ...selectedManageCourse, modules: updatedModules };
      setSelectedManageCourse(refreshed);
      fetchInstructorDashboard();
    } catch (error) {
      alert("Failed to add module.");
    }
  };

  const deleteModule = async (modId) => {
    if (!window.confirm("Remove this module?")) return;
    const updated = selectedManageCourse.modules.filter(m => m.id !== modId);
    try {
      await axios.put(`${API_BASE}/courses/${selectedManageCourse._id}`, {
        ...selectedManageCourse,
        modules: updated
      });
      setSelectedManageCourse({ ...selectedManageCourse, modules: updated });
      fetchInstructorDashboard();
    } catch (error) {
      alert("Failed to delete module.");
    }
  };

  const handleAddSubmodule = async (e, modId) => {
    e.preventDefault();
    const form = e.target;
    const title = form.elements.subTitle.value.trim();
    const durationVal = parseInt(form.elements.subDuration.value);
    const unit = form.elements.subUnit.value;
    
    if (!title || isNaN(durationVal)) return;
    
    const duration = unit === "hrs" ? durationVal * 60 : durationVal;
    
    const newSubmodule = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      duration
    };
    
    const updatedModules = selectedManageCourse.modules.map(m => {
      if (m.id === modId) {
        return {
          ...m,
          submodules: [...(m.submodules || []), newSubmodule]
        };
      }
      return m;
    });
    
    try {
      await axios.put(`${API_BASE}/courses/${selectedManageCourse._id}`, {
        ...selectedManageCourse,
        modules: updatedModules
      });
      alert("Submodule added successfully!");
      form.reset();
      
      const refreshed = { ...selectedManageCourse, modules: updatedModules };
      setSelectedManageCourse(refreshed);
      fetchInstructorDashboard();
    } catch (error) {
      alert("Failed to add submodule.");
    }
  };

  const handleDeleteSubmodule = async (modId, subId) => {
    if (!window.confirm("Remove this submodule?")) return;
    
    const updatedModules = selectedManageCourse.modules.map(m => {
      if (m.id === modId) {
        return {
          ...m,
          submodules: (m.submodules || []).filter(sub => sub.id !== subId)
        };
      }
      return m;
    });
    
    try {
      await axios.put(`${API_BASE}/courses/${selectedManageCourse._id}`, {
        ...selectedManageCourse,
        modules: updatedModules
      });
      
      const refreshed = { ...selectedManageCourse, modules: updatedModules };
      setSelectedManageCourse(refreshed);
      fetchInstructorDashboard();
    } catch (error) {
      alert("Failed to delete submodule.");
    }
  };

  const generateAIQuizForCourse = async () => {
    if (!selectedManageCourse) return;
    alert("AI is generating 5 multiple-choice questions for the course syllabus...");
    try {
      const response = await axios.post(`${API_BASE}/courses/${selectedManageCourse._id}/generate-quiz`);
      setSelectedManageCourse(prev => ({ ...prev, quiz: response.data }));
      alert("AI Quiz generated and appended to course assessment!");
    } catch (e) {
      alert("AI Quiz generation failed.");
    }
  };

  // ================= DISCUSSION / COMMENT DOUBT REPLIES =================
  const [commentReplyText, setCommentReplyText] = useState({});

  const replyToStudentComment = async (courseId, commentId) => {
    const text = commentReplyText[commentId];
    if (!text || !text.trim()) return;

    try {
      await axios.post(`${API_BASE}/courses/${courseId}/comments/${commentId}/reply`, {
        fullName: currentUser.fullName,
        text: text
      });
      alert("Reply posted successfully!");
      setCommentReplyText(prev => ({ ...prev, [commentId]: "" }));
      
      // Refresh details
      const response = await axios.get(`${API_BASE}/courses/${courseId}`);
      setSelectedManageCourse(response.data);
    } catch (error) {
      alert("Failed to reply.");
    }
  };

  // ================= COMMUNICATIONS PANEL =================
  const [announcement, setAnnouncement] = useState({ title: "", message: "", recipient: "all_students" });
  const [sendingCommunication, setSendingCommunication] = useState(false);

  const handleSendAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcement.title.trim() || !announcement.message.trim()) return;
    setSendingCommunication(true);
    try {
      await axios.post(`${API_BASE}/instructor/communication`, {
        email: currentUser.email,
        fullName: currentUser.fullName,
        title: announcement.title,
        message: announcement.message,
        recipient: announcement.recipient
      });
      alert("Announcements broadcasted to student inbox and emails successfully!");
      setAnnouncement({ title: "", message: "", recipient: "all_students" });
    } catch (e) {
      alert("Broadcast announcement failed.");
    }
    setSendingCommunication(false);
  };

  // ================= STUDENT ACCESS REGISTRY =================
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [studentDeadline, setStudentDeadline] = useState({});

  useEffect(() => {
    if (currentTab === "student-access") {
      fetchEnrolledStudents();
    }
  }, [currentTab]);

  const fetchEnrolledStudents = async () => {
    try {
      const response = await axios.get(`${API_BASE}/instructor/students`, {
        params: { email: currentUser.email }
      });
      setEnrolledStudents(response.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetDeadline = async (studentEmail, courseId) => {
    const date = studentDeadline[`${studentEmail}_${courseId}`];
    if (!date) {
      alert("Please select a valid deadline date.");
      return;
    }
    try {
      await axios.post(`${API_BASE}/instructor/students/deadline`, {
        studentEmail,
        courseId,
        deadline: date
      });
      alert("Student course completion deadline has been updated!");
      fetchEnrolledStudents();
    } catch (e) {
      alert("Failed to set deadline.");
    }
  };

  const removeStudent = async (studentEmail, courseId) => {
    if (!window.confirm("Are you sure you want to expel/remove this student from the course?")) return;
    try {
      await axios.post(`${API_BASE}/instructor/students/remove`, {
        studentEmail,
        courseId
      });
      alert("Student enrollment terminated successfully.");
      fetchEnrolledStudents();
    } catch (e) {
      alert("Failed to remove student.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon" style={{background: "#8B5CF6"}}>👨‍🏫</div>
          <div>
            <h2>Lumina</h2>
            <p>Instructor Hub</p>
          </div>
        </div>

        <div className="menu-section">
          <span>Manage Curriculum</span>
          <ul>
            <li className={currentTab === "dashboard" ? "active" : ""} onClick={() => { setCurrentTab("dashboard"); setSelectedManageCourse(null); }}>Overview</li>
            <li className={currentTab === "courses" ? "active" : ""} onClick={() => { setCurrentTab("courses"); }}>Course Builder</li>
          </ul>
        </div>

        <div className="menu-section">
          <span>Communication</span>
          <ul>
            <li className={currentTab === "announcements" ? "active" : ""} onClick={() => { setCurrentTab("announcements"); setSelectedManageCourse(null); }}>Announcements</li>
          </ul>
        </div>

        <div className="menu-section">
          <span>Registry</span>
          <ul>
            <li className={currentTab === "student-access" ? "active" : ""} onClick={() => { setCurrentTab("student-access"); setSelectedManageCourse(null); }}>Student Access</li>
          </ul>
        </div>

        <div className="profile-box">
          <div className="avatar" style={{background: "#f3e8ff", color: "#6b21a8"}}>
            {currentUser.fullName.charAt(0)}
          </div>
          <div>
            <h4>{currentUser.fullName}</h4>
            <p onClick={handleLogout} style={{color: "#ef4444", cursor: "pointer", fontWeight: "600"}}>Logout</p>
          </div>
        </div>
      </aside>

      {/* Main content pane */}
      <main className="dashboard-content">
        <header className="topbar">
          <div style={{fontWeight: "600", fontSize: "18px", color: "#475569"}}>
            Instructor Suite / {currentTab.toUpperCase()}
          </div>
          <div className="topbar-right">
            <button className="ai-active" style={{background: "#f3e8ff", color: "#8b5cf6"}}>✨ AI Panel</button>
            <div className="top-avatar" style={{background: "#f3e8ff", color: "#6b21a8"}}>{currentUser.fullName.charAt(0)}</div>
          </div>
        </header>

        {/* ================= TAB 1: OVERVIEW ================= */}
        {currentTab === "dashboard" && (
          <div>
            <div className="welcome-section" style={{marginBottom: "24px"}}>
              <div>
                <h1>Welcome back, Instructor {currentUser.fullName} 👋</h1>
                <p>Monitor your courses enrollment statistics, average ratings, and students registry.</p>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card" style={{borderLeft: "6px solid #8b5cf6"}}>
                <div className="stat-top">
                  <span>TOTAL COURSES</span>
                  <div className="stat-icon">📚</div>
                </div>
                <h2>{stats.totalCourses}</h2>
                <p>Created</p>
              </div>
              <div className="stat-card" style={{borderLeft: "6px solid #10b981"}}>
                <div className="stat-top">
                  <span>TOTAL STUDENTS</span>
                  <div className="stat-icon">👥</div>
                </div>
                <h2>{stats.totalEnrolled}</h2>
                <p>Enrolled Learners</p>
              </div>
              <div className="stat-card" style={{borderLeft: "6px solid #f59e0b"}}>
                <div className="stat-top">
                  <span>AVG. RATING</span>
                  <div className="stat-icon">⭐</div>
                </div>
                <h2>{stats.avgRating}</h2>
                <p>Review Average</p>
              </div>
            </div>

            {/* Courses Overview table */}
            <div style={{background: "white", borderRadius: "18px", border: "1px solid #e2e8f0", padding: "20px", marginTop: "30px"}}>
              <h3 style={{marginBottom: "16px"}}>Active Classrooms</h3>
              {loading ? (
                <p>Loading course information...</p>
              ) : coursesList.length === 0 ? (
                <p style={{color: "#64748b"}}>You have not created any courses yet. Go to Course Builder to start!</p>
              ) : (
                <table style={{width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px"}}>
                  <thead>
                    <tr style={{borderBottom: "1px solid #e2e8f0", color: "#64748b"}}>
                      <th style={{padding: "12px"}}>Course Title</th>
                      <th style={{padding: "12px"}}>Level</th>
                      <th style={{padding: "12px"}}>Duration</th>
                      <th style={{padding: "12px"}}>Enrolled Students</th>
                      <th style={{padding: "12px"}}>Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coursesList.map((course, idx) => (
                      <tr key={idx} style={{borderBottom: "1px solid #f1f5f9"}}>
                        <td style={{padding: "12px", fontWeight: "600", color: "#1e293b"}}>{course.courseName}</td>
                        <td style={{padding: "12px"}}>{course.level}</td>
                        <td style={{padding: "12px"}}>{course.duration}</td>
                        <td style={{padding: "12px"}}>{course.enrolledCount} learners</td>
                        <td style={{padding: "12px", color: "#f59e0b"}}>★ {course.avgRating}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: COURSE BUILDER ================= */}
        {currentTab === "courses" && (
          <div>
            {!selectedManageCourse ? (
              <div>
                <div className="welcome-section" style={{marginBottom: "24px"}}>
                  <div>
                    <h1 style={{fontSize: "28px", color: "#1e293b"}}>My Course Catalog</h1>
                    <p style={{color: "#64748b", marginTop: "6px"}}>Build modular curriculum topics, generate AI assessments, and answer student doubts.</p>
                  </div>
                  <button className="tutor-btn" style={{background: "#8B5CF6", flexShrink: 0}} onClick={() => { setEditingCourseId(null); setShowCourseModal(true); }}>
                    + Create Course
                  </button>
                </div>

                {loading ? (
                  <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px"}}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{background: "white", borderRadius: "18px", border: "1px solid #e2e8f0", padding: "20px", minHeight: "200px", animation: "pulse-mic 1.5s infinite"}}>
                        <div style={{height: "8px", borderRadius: "999px", background: "#f1f5f9", marginBottom: "16px"}} />
                        <div style={{height: "16px", borderRadius: "8px", background: "#f1f5f9", width: "60%", marginBottom: "12px"}} />
                        <div style={{height: "12px", borderRadius: "8px", background: "#f1f5f9", width: "90%"}} />
                      </div>
                    ))}
                  </div>
                ) : coursesList.length === 0 ? (
                  <div style={{background: "white", borderRadius: "20px", border: "2px dashed #e2e8f0", padding: "60px 20px", textAlign: "center"}}>
                    <BookOpen size={56} color="#c7d2fe" style={{margin: "0 auto 16px"}} />
                    <h2 style={{color: "#1e293b", fontSize: "22px", marginBottom: "8px"}}>No courses created yet</h2>
                    <p style={{color: "#64748b", marginBottom: "24px"}}>Create your first course to start building your curriculum and engaging with students.</p>
                    <button className="tutor-btn" style={{background: "#8B5CF6"}} onClick={() => { setEditingCourseId(null); setShowCourseModal(true); }}>
                      + Create Your First Course
                    </button>
                  </div>
                ) : (
                  <div className="courses-listing-grid" style={{display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px"}}>
                    {coursesList.map((course, idx) => (
                      <div key={idx} style={{background: "white", borderRadius: "18px", border: "1px solid #e2e8f0", padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between"}}>
                        <div>
                          <div style={{height: "6px", borderRadius: "999px", background: course.color || "#8B5CF6", marginBottom: "16px"}} />
                          <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px"}}>
                            <span style={{fontSize: "12px", background: "#f3e8ff", color: "#6b21a8", padding: "4px 8px", borderRadius: "999px"}}>{course.level}</span>
                            <span style={{fontSize: "12px", background: course.published !== false ? "#d1fae5" : "#fee2e2", color: course.published !== false ? "#065f46" : "#b91c1c", padding: "4px 8px", borderRadius: "999px", fontWeight: "600"}}>
                              {course.published !== false ? "● Live" : "● Draft"}
                            </span>
                          </div>
                          <h3 style={{margin: "0 0 6px", color: "#0f172a", fontSize: "17px"}}>{course.courseName}</h3>
                          <p style={{color: "#64748b", fontSize: "13px", lineHeight: "1.5"}}>{(course.description || "").slice(0, 100)}{(course.description || "").length > 100 ? "..." : ""}</p>
                          
                          <div style={{display: "flex", gap: "16px", marginTop: "14px", fontSize: "12px", color: "#64748b"}}>
                            <span>👥 {course.enrolledCount || 0} enrolled</span>
                            <span>⭐ {course.avgRating || 0}</span>
                            <span>📖 {(course.modules || []).length} modules</span>
                          </div>
                        </div>

                        <div style={{display: "flex", gap: "8px", marginTop: "18px", flexWrap: "wrap"}}>
                          <button className="tutor-btn" style={{flex: 1, background: "#8b5cf6", fontSize: "13px", padding: "10px 14px"}} onClick={() => setSelectedManageCourse(course)}>Manage Syllabus</button>
                          <button style={{background: "#e2e8f0", border: "none", borderRadius: "10px", padding: "10px 12px", cursor: "pointer"}} onClick={() => startEditCourse(course)} title="Edit"><Edit size={15} /></button>
                          <button style={{background: "#fee2e2", border: "none", color: "#ef4444", borderRadius: "10px", padding: "10px 12px", cursor: "pointer"}} onClick={() => handleDeleteCourse(course._id)} title="Delete"><Trash2 size={15} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            ) : (
              // Selected Syllabus Manage View
              <div style={{background: "white", borderRadius: "20px", border: "1px solid #e2e8f0", padding: "24px"}}>
                <button onClick={() => { setSelectedManageCourse(null); fetchInstructorDashboard(); }} style={{background: "none", border: "none", color: "#8b5cf6", fontWeight: "600", cursor: "pointer", marginBottom: "16px"}}>← Back to Course List</button>
                
                <h1 style={{color: "#1e293b"}}>{selectedManageCourse.courseName} Syllabus Suite</h1>
                <p style={{color: "#64748b"}}>{selectedManageCourse.description}</p>
                
                <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", marginTop: "24px"}}>
                  {/* Module Editor form & Syllabus list */}
                  <div>
                    <h3>Create Syllabus Lecture Module</h3>
                    <form onSubmit={handleAddModule} style={{display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px", background: "#fcfcfd", border: "1px solid #cbd5e1", padding: "16px", borderRadius: "12px"}}>
                      <input style={{padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px"}} placeholder="Lecture Title (e.g. Intro to Arrays)" value={moduleForm.title} onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })} required />
                      <textarea style={{padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px", height: "60px", fontFamily: "inherit"}} placeholder="Module brief description..." value={moduleForm.description} onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })} />
                      <div style={{display: "flex", gap: "10px"}}>
                        <select style={{flex: 1, padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px"}} value={moduleForm.contentType} onChange={(e) => setModuleForm({ ...moduleForm, contentType: e.target.value })}>
                          <option value="pdf">PDF Text Slides</option>
                          <option value="video">Pre-recorded Video</option>
                          <option value="live">Live Class Link</option>
                        </select>
                        <input style={{flex: 2, padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px"}} placeholder="Content url/filename..." value={moduleForm.contentUrl} onChange={(e) => setModuleForm({ ...moduleForm, contentUrl: e.target.value })} />
                      </div>
                      <button className="tutor-btn" style={{background: "#8b5cf6"}} type="submit">+ Add Module</button>
                    </form>

                    <h3 style={{marginTop: "24px"}}>Curriculum Timeline</h3>
                    <div style={{display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px"}}>
                      {selectedManageCourse.modules.length === 0 ? (
                        <p style={{color: "#94a3b8", fontSize: "14px"}}>No modules uploaded yet.</p>
                      ) : (
                        selectedManageCourse.modules.map((m, idx) => (
                          <div key={idx} style={{border: "1px solid #e2e8f0", borderRadius: "12px", background: "white", padding: "16px", marginBottom: "8px"}}>
                            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                              <div>
                                <h4 style={{margin: 0, color: "#334155"}}>{idx + 1}. {m.title}</h4>
                                <span style={{fontSize: "11px", color: "#64748b"}}>{m.contentType.toUpperCase()} content • {(m.submodules || []).length} submodules</span>
                              </div>
                              <div style={{display: "flex", gap: "10px", alignItems: "center"}}>
                                <button 
                                  style={{background: "none", border: "none", color: "#4f46e5", cursor: "pointer", fontSize: "13px", fontWeight: "600"}}
                                  onClick={() => setEditingSubmodulesModId(editingSubmodulesModId === m.id ? null : m.id)}
                                >
                                  {editingSubmodulesModId === m.id ? "Hide" : "Manage"}
                                </button>
                                <button style={{background: "none", border: "none", color: "#ef4444", cursor: "pointer"}} onClick={() => deleteModule(m.id)}><Trash2 size={16} /></button>
                              </div>
                            </div>
                            
                            {editingSubmodulesModId === m.id && (
                              <div style={{marginTop: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "12px"}}>
                                <h5 style={{margin: "0 0 8px", color: "#475569"}}>Submodules Checklist</h5>
                                <div style={{display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px"}}>
                                  {(!m.submodules || m.submodules.length === 0) ? (
                                    <p style={{fontSize: "12px", color: "#94a3b8"}}>No submodules configured yet.</p>
                                  ) : (
                                    m.submodules.map((sub, sidx) => (
                                      <div key={sidx} style={{display: "flex", justifyContent: "space-between", background: "#f8fafc", padding: "8px 12px", borderRadius: "6px", fontSize: "13px"}}>
                                        <span>{sub.title} ({sub.duration} mins)</span>
                                        <button 
                                          style={{background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "12px"}}
                                          onClick={() => handleDeleteSubmodule(m.id, sub.id)}
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    ))
                                  )}
                                </div>
                                
                                <form onSubmit={(e) => handleAddSubmodule(e, m.id)} style={{display: "flex", gap: "8px", alignItems: "center"}}>
                                  <input 
                                    style={{flex: 2, padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px"}} 
                                    placeholder="Submodule Title"
                                    name="subTitle"
                                    required
                                  />
                                  <input 
                                    type="number" 
                                    style={{width: "70px", padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px"}} 
                                    placeholder="Duration"
                                    name="subDuration"
                                    min="1"
                                    required
                                  />
                                  <select 
                                    name="subUnit"
                                    style={{padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", background: "white"}}
                                  >
                                    <option value="mins">Mins</option>
                                    <option value="hrs">Hrs</option>
                                  </select>
                                  <button type="submit" className="tutor-btn" style={{padding: "6px 12px", fontSize: "12px"}}>Add</button>
                                </form>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* AI Quiz Generator & Comments doubt panel */}
                  <div>
                    <div style={{background: "#faf5ff", border: "1px dashed #c084fc", padding: "20px", borderRadius: "14px"}}>
                      <h3 style={{color: "#6b21a8", display: "flex", alignItems: "center", gap: "6px"}}><Award size={18} /> Course Completion Assessment Quiz</h3>
                      <p style={{fontSize: "13px", color: "#581c87", margin: "8px 0 16px"}}>Generate a 5-question multi-choice assessment quiz based on your modular syllabus content using AI.</p>
                      <button className="tutor-btn" style={{background: "#a855f7", width: "100%"}} onClick={generateAIQuizForCourse}>
                        Generate AI Assessment Quiz
                      </button>

                      {selectedManageCourse.quiz?.questions?.length > 0 && (
                        <div style={{marginTop: "16px", background: "white", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0"}}>
                          <span style={{color: "#16a34a", fontWeight: "600", fontSize: "13px"}}>✓ Assessment Quiz Configured</span>
                          <span style={{fontSize: "12px", display: "block", color: "#64748b", marginTop: "4px"}}>{selectedManageCourse.quiz.questions.length} multiple choice questions are active.</span>
                        </div>
                      )}
                    </div>

                    {/* Course comment reply board */}
                    <div style={{marginTop: "24px"}}>
                      <h3>Student Classroom Doubt Forum</h3>
                      <div style={{display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px", maxHeight: "250px", overflowY: "auto"}}>
                        {selectedManageCourse.comments?.length === 0 ? (
                          <p style={{color: "#94a3b8", fontSize: "13px"}}>No student inquiries logged on this classroom.</p>
                        ) : (
                          selectedManageCourse.comments?.map((comm, idx) => (
                            <div key={idx} style={{padding: "12px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px"}}>
                              <div style={{fontSize: "12px", color: "#64748b"}}>Question from: {comm.studentName} ({comm.timestamp})</div>
                              <p style={{fontWeight: "600", fontSize: "14px", color: "#1e293b", margin: "6px 0"}}>{comm.text}</p>
                              
                              {/* Existing replies */}
                              {comm.replies && comm.replies.map((rep, rIdx) => (
                                <div key={rIdx} style={{marginLeft: "12px", marginTop: "6px", fontSize: "13px", color: "#14532d", background: "#f0fdf4", padding: "6px", borderRadius: "4px"}}>
                                  <strong>You replied:</strong> {rep.text}
                                </div>
                              ))}

                              {/* Quick Reply form */}
                              <div style={{display: "flex", gap: "6px", marginTop: "10px"}}>
                                <input 
                                  style={{flex: 1, padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px"}} 
                                  placeholder="Type reply to student..." 
                                  value={commentReplyText[comm.id] || ""}
                                  onChange={(e) => setCommentReplyText({ ...commentReplyText, [comm.id]: e.target.value })}
                                />
                                <button className="tutor-btn" style={{background: "#8b5cf6", padding: "6px 12px", fontSize: "12px"}} onClick={() => replyToStudentComment(selectedManageCourse._id, comm.id)}>
                                  Reply
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: ANNOUNCEMENTS ================= */}
        {currentTab === "announcements" && (
          <div style={{background: "white", padding: "24px", borderRadius: "20px", border: "1px solid #e2e8f0"}}>
            <div className="welcome-section" style={{marginBottom: "24px", marginTop: 0}}>
              <div>
                <h1>Broadcast Communications</h1>
                <p>Distribute alerts, reminders, or syllabus notifications to student dashboards and registered emails.</p>
              </div>
            </div>

            <form onSubmit={handleSendAnnouncement} style={{display: "flex", flexDirection: "column", gap: "16px", maxWidth: "600px"}}>
              <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                <label style={{fontSize: "14px", fontWeight: "600", color: "#475569"}}>Select Recipient Scope:</label>
                <select 
                  style={{padding: "12px", border: "1px solid #cbd5e1", borderRadius: "10px"}}
                  value={announcement.recipient}
                  onChange={(e) => setAnnouncement({ ...announcement, recipient: e.target.value })}
                >
                  <option value="all_students">All Students (Universal)</option>
                  {coursesList.map((c, idx) => (
                    <option key={idx} value={c._id}>Students in: {c.courseName}</option>
                  ))}
                </select>
              </div>

              <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                <label style={{fontSize: "14px", fontWeight: "600", color: "#475569"}}>Notification Title:</label>
                <input 
                  style={{padding: "12px", border: "1px solid #cbd5e1", borderRadius: "10px"}}
                  placeholder="e.g. Schedule Update: Live Review Session"
                  value={announcement.title}
                  onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                  required
                />
              </div>

              <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                <label style={{fontSize: "14px", fontWeight: "600", color: "#475569"}}>Message Body:</label>
                <textarea 
                  style={{height: "160px", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "10px", fontFamily: "inherit"}}
                  placeholder="Write announcement description..."
                  value={announcement.message}
                  onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                  required
                />
              </div>

              <button className="tutor-btn" style={{background: "#8b5cf6", width: "100%"}} type="submit" disabled={sendingCommunication}>
                {sendingCommunication ? "Broadcasting Alert..." : "Broadcast announcement & Send Emails"}
              </button>
            </form>
          </div>
        )}

        {/* ================= TAB 4: STUDENT ACCESS ================= */}
        {currentTab === "student-access" && (
          <div style={{background: "white", padding: "24px", borderRadius: "20px", border: "1px solid #e2e8f0"}}>
            <div className="welcome-section" style={{marginBottom: "24px", marginTop: 0}}>
              <div>
                <h1>Access Registry</h1>
                <p>Review enrolled student rosters, configure completion deadlines, or revoke enrollment permissions.</p>
              </div>
            </div>

            <table style={{width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px"}}>
              <thead>
                <tr style={{borderBottom: "1px solid #e2e8f0", color: "#64748b"}}>
                  <th style={{padding: "12px"}}>Learner Name</th>
                  <th style={{padding: "12px"}}>Email</th>
                  <th style={{padding: "12px"}}>Classroom</th>
                  <th style={{padding: "12px"}}>Status</th>
                  <th style={{padding: "12px"}}>Assessment Grade</th>
                  <th style={{padding: "12px"}}>Revocation Deadline</th>
                  <th style={{padding: "12px"}}>Revoke</th>
                </tr>
              </thead>
              <tbody>
                {enrolledStudents.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{padding: "20px", textAlign: "center", color: "#94a3b8"}}>No students enrolled in your courses yet.</td>
                  </tr>
                ) : (
                  enrolledStudents.map((stud, idx) => {
                    const deadlineKey = `${stud.studentEmail}_${stud.courseId}`;
                    return (
                      <tr key={idx} style={{borderBottom: "1px solid #f1f5f9"}}>
                        <td style={{padding: "12px", fontWeight: "600", color: "#1e293b"}}>{stud.studentName}</td>
                        <td style={{padding: "12px"}}>{stud.studentEmail}</td>
                        <td style={{padding: "12px"}}>{stud.courseName}</td>
                        <td style={{padding: "12px"}}>
                          <span style={{
                            padding: "4px 8px", borderRadius: "999px", fontSize: "12px", fontWeight: "600",
                            background: stud.status === "Completed" ? "#d1fae5" : "#eef2ff",
                            color: stud.status === "Completed" ? "#065f46" : "#4f46e5"
                          }}>
                            {stud.status}
                          </span>
                        </td>
                        <td style={{padding: "12px", fontWeight: "600"}}>{stud.quizScore !== null ? `${stud.quizScore}%` : "Not Attempted"}</td>
                        <td style={{padding: "12px"}}>
                          <div style={{display: "flex", gap: "6px", alignItems: "center"}}>
                            <input 
                              type="date" 
                              style={{padding: "6px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px"}} 
                              defaultValue={stud.deadline || ""}
                              onChange={(e) => setStudentDeadline({ ...studentDeadline, [deadlineKey]: e.target.value })}
                            />
                            <button className="tutor-btn" style={{background: "#475569", padding: "6px 10px", fontSize: "12px"}} onClick={() => handleSetDeadline(stud.studentEmail, stud.courseId)}>
                              Set
                            </button>
                          </div>
                          {stud.deadline && <span style={{fontSize: "11px", color: "#e11d48", display: "block", marginTop: "4px"}}>Deadline set: {stud.deadline}</span>}
                        </td>
                        <td style={{padding: "12px"}}>
                          <button style={{background: "#fee2e2", border: "none", color: "#ef4444", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontWeight: "600", fontSize: "12px"}} onClick={() => removeStudent(stud.studentEmail, stud.courseId)}>
                            Revoke Enrolment
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal: Create/Edit Course Form */}
        {showCourseModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>{editingCourseId ? "Edit Course Parameters" : "Create Course"}</h2>
              
              <input 
                placeholder="Course Name (e.g. Advanced JavaScript)" 
                value={courseForm.courseName}
                onChange={(e) => setCourseForm({ ...courseForm, courseName: e.target.value })}
                required
              />
              <textarea 
                style={{height: "100px", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "10px", fontFamily: "inherit"}}
                placeholder="Course syllabus brief description..." 
                value={courseForm.description}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                required
              />
              <select 
                value={courseForm.level}
                onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
              <input 
                placeholder="Duration (e.g. 6 weeks)" 
                value={courseForm.duration}
                onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
              />

              <div className="modal-actions">
                <button className="tutor-btn" style={{background: "#8b5cf6"}} onClick={handleSaveCourse}>
                  {editingCourseId ? "Update" : "Save Classroom"}
                </button>
                <button className="tutor-btn" style={{background: "#64748b"}} onClick={() => { setShowCourseModal(false); setEditingCourseId(null); }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default InstructorDashboard;
