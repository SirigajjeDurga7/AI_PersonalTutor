import "./Register.css";
import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useParams, Link } from "react-router-dom";

function Register() {
  const { role } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // NEW: State variables to manage in-card feedback notifications
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState(""); // Can be 'success' or 'error'

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setStatusMessage(""); // Clear any previous alerts on new submit

    if (formData.password !== formData.confirmPassword) {
      setStatusType("error");
      setStatusMessage("Passwords do not match");
      return;
    }

    try {
      const baseUrl = "https://onrender.com";

      const response = await axios.post(`${baseUrl}/register`, {
        fullName: formData.fullName,
        email: formData.email, 
        password: formData.password,
        role: role,
      });

      // Show Custom Green Success Box
      setStatusType("success");
      setStatusMessage(response.data.message);

      // Wait 2 seconds so the student can read the nice message, then redirect to login page
      setTimeout(() => {
        navigate(`/login/${role}`);
      }, 2000);

    } catch (error) {
      console.error("Registration Error Details:", error);
      setStatusType("error"); // Show Custom Red Error Box
      
      setStatusMessage(
        error.response?.data?.message || "Registration failed. Database connection issue."
      );
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h1>Create {role.charAt(0).toUpperCase() + role.slice(1)} Account</h1>
        <p>Join Lumina and start your learning journey.</p>

        <form onSubmit={handleRegister}>
          <input
            type="text"
            name="fullName"
            placeholder="Full Name"
            required
            value={formData.fullName}
            onChange={handleChange}
          />

          <input
            type="text"
            name="email"
            placeholder="Email Address"
            required
            value={formData.email}
            onChange={handleChange}
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            value={formData.password}
            onChange={handleChange}
          />

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
          />

          <button type="submit">Register</button>

          {/* NEW: Dynamic Embedded Status Notification Boxes */}
          {statusMessage && (
            <div className={`status-box ${statusType}-box`}>
              {statusMessage}
            </div>
          )}
        </form>

        <p className="login-link">
          Already have an account?{" "}
          <Link to={`/login/${role}`}>Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
