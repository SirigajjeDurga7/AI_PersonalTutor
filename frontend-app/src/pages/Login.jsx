import "./Login.css";
import { useState } from "react";
import axios from "axios";
import { useParams, Link, useNavigate } from "react-router-dom";

function Login() {
  const { role } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      // FIXED: Pointing directly to your live Render backend URL
      const baseUrl = "https://ai-personal-tutor-owly.onrender.com";

      // Connects directly to the live backend domain on Render
      const response = await axios.post(`${baseUrl}/login`, {
        email: formData.email,
        password: formData.password,
        role: role,
      });

      alert(response.data.message);

      navigate("/verify-otp", {
        state: {
          email: formData.email,
          role,
        },
      });
    } catch (error) {
      console.error("Login Network Error Details:", error);

      if (!error.response) {
        alert("Network error: Cannot reach the backend server on Render.");
      } else {
        alert(error.response?.data?.message || "Login failed");
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>{role.charAt(0).toUpperCase() + role.slice(1)} Login</h1>
        <p>Welcome back! Sign in to continue.</p>

        <form onSubmit={handleLogin}>
          {/* Note: Kept as text instead of email to cleanly accept international phone formats */}
          <input
            type="text"
            name="email"
            placeholder="Mobile Number (e.g. +91XXXXXXXXXX)"
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

          <button type="submit">Send OTP</button>
        </form>

        <p className="register-link">
          Don't have an account?{" "}
          <Link to={`/register/${role}`}>Register</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
