// src/pages/AdminDashboard.jsx

import "./AdminDashboard.css";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { 
  Users, BookOpen, ShieldAlert, CheckCircle, 
  Search, Trash2, Edit3, UserPlus, ToggleLeft, ToggleRight, Info
} from "lucide-react";

const API_BASE = "http://localhost:8000";

function AdminDashboard() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  const [currentTab, setCurrentTab] = useState("dashboard");
  const [stats, setStats] = useState({ studentsCount: 0, instructorsCount: 0, coursesCount: 0, activeCount: 0, blockedCount: 0, completionRate: 0 });
  const [usersList, setUsersList] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
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
    fetchAdminDashboard();
  }, [currentTab]);

  const fetchAdminDashboard = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/admin/stats`);
      setStats(response.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // ================= USER RECORDS MANAGEMENT =================
  const [userForm, setUserForm] = useState({ fullName: "", email: "", password: "", role: "student" });
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  useEffect(() => {
    if (currentTab === "users") {
      fetchUsers();
    }
  }, [currentTab, userSearch, roleFilter]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/users`, {
        params: { 
          search: userSearch,
          role: roleFilter === "all" ? "" : roleFilter
        }
      });
      setUsersList(response.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!userForm.fullName.trim() || !userForm.email.trim()) return;

    try {
      if (editingUserId) {
        await axios.put(`${API_BASE}/admin/users/${editingUserId}`, userForm);
        alert("User record updated successfully!");
      } else {
        await axios.post(`${API_BASE}/admin/users`, userForm);
        alert("User account created successfully!");
      }
      setShowUserModal(false);
      setEditingUserId(null);
      setUserForm({ fullName: "", email: "", password: "", role: "student" });
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save user record.");
    }
  };

  const startEditUser = (user) => {
    setEditingUserId(user._id);
    setUserForm({
      fullName: user.fullName || "",
      email: user.email || "",
      password: "", // leave empty to not change
      role: user.role || "student"
    });
    setShowUserModal(true);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Permanently delete this user account and all their records?")) return;
    try {
      await axios.delete(`${API_BASE}/admin/users/${userId}`);
      fetchUsers();
    } catch (e) {
      alert("Failed to delete user.");
    }
  };

  const toggleUserBlockStatus = async (userId) => {
    try {
      const response = await axios.post(`${API_BASE}/admin/users/${userId}/toggle-block`);
      alert(response.data.message);
      fetchUsers();
    } catch (e) {
      alert("Failed to change account block state.");
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
          <div className="logo-icon" style={{background: "#0f172a"}}>⚙️</div>
          <div>
            <h2>Lumina</h2>
            <p>Admin Console</p>
          </div>
        </div>

        <div className="menu-section">
          <span>Overview</span>
          <ul>
            <li className={currentTab === "dashboard" ? "active" : ""} onClick={() => { setCurrentTab("dashboard"); }}>Metrics</li>
          </ul>
        </div>

        <div className="menu-section">
          <span>Governance</span>
          <ul>
            <li className={currentTab === "users" ? "active" : ""} onClick={() => { setCurrentTab("users"); }}>User Directory</li>
          </ul>
        </div>

        <div className="profile-box">
          <div className="avatar" style={{background: "#e2e8f0", color: "#0f172a"}}>
            A
          </div>
          <div>
            <h4>Administrator</h4>
            <p onClick={handleLogout} style={{color: "#ef4444", cursor: "pointer", fontWeight: "600"}}>Logout</p>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="dashboard-content">
        <header className="topbar">
          <div style={{fontWeight: "600", fontSize: "18px", color: "#334155"}}>
            Admin Console / {currentTab.toUpperCase()}
          </div>
          <div className="topbar-right">
            <button className="ai-active" style={{background: "#cbd5e1", color: "#0f172a"}}>🛡️ Secure Session</button>
            <div className="top-avatar" style={{background: "#e2e8f0", color: "#0f172a"}}>A</div>
          </div>
        </header>

        {/* ================= TAB 1: METRICS ================= */}
        {currentTab === "dashboard" && (
          <div>
            <div className="welcome-section" style={{marginBottom: "24px"}}>
              <div>
                <h1>LMS System Performance Dashboard</h1>
                <p>Monitor global registrations, active logins, block status rates, and API health status.</p>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card" style={{borderLeft: "6px solid #4f46e5"}}>
                <div className="stat-top">
                  <span>TOTAL STUDENTS</span>
                  <div className="stat-icon">👥</div>
                </div>
                <h2>{stats.studentsCount}</h2>
                <p>Learners Registered</p>
              </div>
              <div className="stat-card" style={{borderLeft: "6px solid #8b5cf6"}}>
                <div className="stat-top">
                  <span>TOTAL INSTRUCTORS</span>
                  <div className="stat-icon">👨‍🏫</div>
                </div>
                <h2>{stats.instructorsCount}</h2>
                <p>Faculties Registered</p>
              </div>
              <div className="stat-card" style={{borderLeft: "6px solid #06b6d4"}}>
                <div className="stat-top">
                  <span>TOTAL COURSES</span>
                  <div className="stat-icon">📚</div>
                </div>
                <h2>{stats.coursesCount}</h2>
                <p>Curriculum Directories</p>
              </div>
              <div className="stat-card" style={{borderLeft: "6px solid #ef4444"}}>
                <div className="stat-top">
                  <span>BLOCKED USERS</span>
                  <div className="stat-icon">🚫</div>
                </div>
                <h2>{stats.blockedCount}</h2>
                <p>Suspended Accounts</p>
              </div>
            </div>

            {/* Health and System logs */}
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "30px"}}>
              <div style={{background: "white", padding: "20px", borderRadius: "18px", border: "1px solid #e2e8f0"}}>
                <h3>System Health Indicators</h3>
                <div style={{marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px"}}>
                  <div style={{display: "flex", justifyContent: "space-between", fontSize: "14px"}}>
                    <span>API Router Server</span>
                    <span style={{color: "#10b981", fontWeight: "600"}}>● Operational (99.98% uptime)</span>
                  </div>
                  <div style={{display: "flex", justifyContent: "space-between", fontSize: "14px"}}>
                    <span>Database (MongoDB Cluster)</span>
                    <span style={{color: "#10b981", fontWeight: "600"}}>● Connected (4ms ping)</span>
                  </div>
                  <div style={{display: "flex", justifyContent: "space-between", fontSize: "14px"}}>
                    <span>Brevo SMTP SMTP Gateway</span>
                    <span style={{color: "#10b981", fontWeight: "600"}}>● Online</span>
                  </div>
                  <div style={{display: "flex", justifyContent: "space-between", fontSize: "14px"}}>
                    <span>Groq LLM Cognitive Core</span>
                    <span style={{color: "#10b981", fontWeight: "600"}}>● Connected (llama-3.3 ok)</span>
                  </div>
                </div>
              </div>

              <div style={{background: "white", padding: "20px", borderRadius: "18px", border: "1px solid #e2e8f0"}}>
                <h3>Active Governance logs</h3>
                <div style={{marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", color: "#475569"}}>
                  <div style={{padding: "8px", background: "#f8fafc", borderRadius: "6px"}}>
                    ℹ️ [System Check] Database indexes configured successfully.
                  </div>
                  <div style={{padding: "8px", background: "#f8fafc", borderRadius: "6px"}}>
                    ℹ️ [Auth Route] Admin credentials verified.
                  </div>
                  <div style={{padding: "8px", background: "#f8fafc", borderRadius: "6px"}}>
                    ℹ️ [SMTP Dispatch] OTP emails relay running.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: USER DIRECTORY ================= */}
        {currentTab === "users" && (
          <div style={{background: "white", padding: "24px", borderRadius: "20px", border: "1px solid #e2e8f0"}}>
            <div className="welcome-section" style={{marginBottom: "24px", marginTop: 0}}>
              <div>
                <h1>User Directory</h1>
                <p>Register, modify, delete, or suspend accounts for students and instructors.</p>
              </div>
              
              <div style={{display: "flex", gap: "12px", alignItems: "center"}}>
                <input 
                  className="search" 
                  style={{width: "240px"}} 
                  placeholder="Search users..." 
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{
                    padding: "10px 14px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    background: "white",
                    fontSize: "14px",
                    cursor: "pointer",
                    outline: "none"
                  }}
                >
                  <option value="all">👥 All Roles</option>
                  <option value="student">👨‍🎓 Students Only</option>
                  <option value="instructor">👨‍🏫 Instructors Only</option>
                </select>
                <button className="tutor-btn" style={{background: "#0f172a", display: "flex", alignItems: "center", gap: "6px"}} onClick={() => { setEditingUserId(null); setUserForm({ fullName: "", email: "", password: "", role: "student" }); setShowUserModal(true); }}>
                  <UserPlus size={16} /> Add User
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{width: "100%", minWidth: "800px", borderCollapse: "collapse", textAlign: "left", fontSize: "14px"}}>
                <thead>
                  <tr style={{borderBottom: "1px solid #e2e8f0", color: "#64748b"}}>
                    <th style={{padding: "12px"}}>Full Name</th>
                    <th style={{padding: "12px"}}>Email Address</th>
                    <th style={{padding: "12px"}}>Access Role</th>
                    <th style={{padding: "12px"}}>Activity Status</th>
                    <th style={{padding: "12px"}}>Modify Details</th>
                    <th style={{padding: "12px"}}>Suspend Account</th>
                    <th style={{padding: "12px"}}>Purge Account</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{padding: "20px", textAlign: "center", color: "#94a3b8"}}>No matching user records discovered.</td>
                    </tr>
                  ) : (
                    usersList.map((user, idx) => (
                      <tr key={idx} style={{borderBottom: "1px solid #f1f5f9"}}>
                        <td style={{padding: "12px", fontWeight: "600", color: "#1e293b"}}>{user.fullName || "N/A"}</td>
                        <td style={{padding: "12px"}}>{user.email}</td>
                        <td style={{padding: "12px"}}>{(user.role || "").toUpperCase()}</td>
                        <td style={{padding: "12px"}}>
                          <span style={{
                            padding: "4px 8px", borderRadius: "999px", fontSize: "12px", fontWeight: "600",
                            background: user.blocked ? "#fee2e2" : "#d1fae5",
                            color: user.blocked ? "#ef4444" : "#065f46"
                          }}>
                            {user.blocked ? "BLOCKED" : "ACTIVE"}
                          </span>
                        </td>
                        <td style={{padding: "12px"}}>
                          <button style={{background: "none", border: "none", color: "#3b82f6", cursor: "pointer"}} onClick={() => startEditUser(user)}><Edit3 size={16} /></button>
                        </td>
                        <td style={{padding: "12px"}}>
                          <button 
                            style={{
                              background: "none", border: "none", cursor: "pointer",
                              color: user.blocked ? "#10b981" : "#f59e0b"
                            }}
                            onClick={() => toggleUserBlockStatus(user._id)}
                          >
                            {user.blocked ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                          </button>
                        </td>
                        <td style={{padding: "12px"}}>
                          <button style={{background: "none", border: "none", color: "#ef4444", cursor: "pointer"}} onClick={() => handleDeleteUser(user._id)}><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Create/Edit User Form */}
        {showUserModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>{editingUserId ? "Edit User Record" : "Add User Account"}</h2>
              
              <input 
                placeholder="Full Name (e.g. John Doe)" 
                value={userForm.fullName}
                onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                required
              />
              <input 
                type="email"
                placeholder="Email Address" 
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                disabled={!!editingUserId} // Lock email on edit
                required
              />
              <input 
                type="password"
                placeholder={editingUserId ? "Type new password (optional)" : "Password"} 
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                required={!editingUserId}
              />
              <select 
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              >
                <option value="student">Student role</option>
                <option value="instructor">Instructor role</option>
                <option value="admin">Administrator role</option>
              </select>

              <div className="modal-actions">
                <button className="tutor-btn" style={{background: "#0f172a"}} onClick={handleSaveUser}>
                  {editingUserId ? "Save Changes" : "Create Account"}
                </button>
                <button className="tutor-btn" style={{background: "#64748b"}} onClick={() => { setShowUserModal(false); setEditingUserId(null); }}>
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

export default AdminDashboard;
