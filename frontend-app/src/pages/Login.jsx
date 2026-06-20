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
    const response = await axios.post(
      "http://localhost:8000/login",
      {
        email: formData.email,
        password: formData.password,
      }
    );

    alert(response.data.message);

    navigate("/verify-otp", {
      state: {
        email: formData.email,
        role,
      },
    });

  } catch (error) {
    console.log("Login Error:", error.response);
alert(
  error.response?.data?.message ||
  "Login failed"
);
  }
};

  return (
    <div className="login-container">

      <div className="login-card">

        <h1>
          {role.charAt(0).toUpperCase() + role.slice(1)} Login
        </h1>

        <p>
          Welcome back! Sign in to continue.
        </p>

        <form onSubmit={handleLogin}>

          <input
            type="email"
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

          <button type="submit">
            Send OTP
          </button>

        </form>

        <p className="register-link">
          Don't have an account?{" "}
          <Link to={`/register/${role}`}>
            Register
          </Link>
        </p>

      </div>

    </div>
  );
}

export default Login;