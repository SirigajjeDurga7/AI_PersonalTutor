import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Register from "./pages/register"; // Match file name case sensitivity perfectly
import Login from "./pages/Login";

import StudentDashboard from "./pages/StudentDashboard";
import InstructorDashboard from "./pages/InstructorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import DashboardComponent from "./pages/dashboard"; // Avoids naming conflicts seamlessly

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login/:role" element={<Login />} />
      <Route path="/register/:role" element={<Register />} />
      
      {/* Target Dashboard Routing Portals */}
      <Route
        path="/student/dashboard"
        element={<StudentDashboard />}
      />
      <Route
        path="/instructor/dashboard"
        element={<InstructorDashboard />}
      />
      <Route
        path="/admin/dashboard"
        element={<AdminDashboard />}
      />
      
      {/* Smart redirect: /dashboard routes to role-specific dashboard automatically */}
      <Route path="/dashboard" element={<DashboardComponent />} />
    </Routes>
  );
}

export default App;
