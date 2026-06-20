import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import VerifyOTP from "./pages/VerifyOTP";

import StudentDashboard from "./pages/StudentDashboard";
import InstructorDashboard from "./pages/InstructorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Dashboard from "./pages/dashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login/:role" element={<Login />} />
      <Route
        path="/register/:role"
        element={<Register />}
      />
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
      <Route path="/verify-otp" element={<VerifyOTP />} />
      {/* Smart redirect: /dashboard routes to role-specific dashboard */}
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default App;