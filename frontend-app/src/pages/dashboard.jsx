// dashboard.jsx - Redirect stub (not used in current routing)
// All dashboards are role-specific: StudentDashboard, InstructorDashboard, AdminDashboard
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    if (!user) {
      navigate("/");
      return;
    }
    if (user.role === "student") navigate("/student/dashboard");
    else if (user.role === "instructor") navigate("/instructor/dashboard");
    else navigate("/admin/dashboard");
  }, []);
  return null;
}

export default Dashboard;
