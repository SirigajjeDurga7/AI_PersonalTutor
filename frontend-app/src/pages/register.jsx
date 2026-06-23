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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      // FIXED: Pointing explicitly to your live Render backend URL
      const baseUrl = "https://onrender.com";

      const response = await axios.post(
        `${baseUrl}/register`,
        {
          fullName: formData.fullName,
          email: formData.email, // Saves your +91 mobile phone number into the identification field slot
          password: formData.password,
          role: role,
        }
      );

      alert(response.data.message);
      navigate(`/login/${role}`);

    } catch (error) {
      alert(
        error.response?.data?.message ||
        "Registration failed"
      );
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h1>
          Create {role.charAt(0).toUpperCase() + role.slice(1)} Account
        </h1>

        <p>
          Join Lumina and start your learning journey.
        </p>

        <form onSubmit={handleRegister}>
          <input
            type="text"
            name="fullName"
            placeholder="Full Name"
            required
            value={formData.fullName}
            onChange={handleChange}
          />

          {/* FIXED: Input type switched to text to allow phone format submissions cleanly */}
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

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
          />

          <button type="submit">
            Register
          </button>
        </form>

        <p className="login-link">
          Already have an account?{" "}
          <Link to={`/login/${role}`}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
