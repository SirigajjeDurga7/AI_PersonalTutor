import "./VerifyOTP.css";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

function VerifyOTP() {
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email || "";
  const role = location.state?.role || "";

  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(30);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleVerify = async (e) => {
    e.preventDefault();

    try {
      // Changed from localhost:8000 to production relative route path
      const response = await axios.post(
        "/verify-otp",
        {
          email,
          otp,
        }
      );

      alert(response.data.message);

      // Save JWT Token
      localStorage.setItem(
        "token",
        response.data.token
      );

      // Save Current User
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          email,
          role: response.data.role,
          fullName: response.data.fullName,
        })
      );

      // Navigate based on role
      if (response.data.role === "student") {
        navigate("/student/dashboard");
      } else if (response.data.role === "instructor") {
        navigate("/instructor/dashboard");
      } else {
        navigate("/admin/dashboard");
      }

    } catch (error) {
      alert(
        error.response?.data?.message ||
        "OTP Verification Failed"
      );
    }
  };

  const handleResend = () => {
    setTimer(30);

    // We can implement resend later
    alert("Please login again to receive a new OTP.");
  };

  return (
    <div className="otp-container">

      <div className="otp-card">

        <h1>Verify OTP</h1>

        <p>
          Enter the OTP sent to
        </p>

        <span>{email}</span>

        <form onSubmit={handleVerify}>

          <input
            type="text"
            maxLength="6"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />

          <button type="submit">
            Verify OTP
          </button>

        </form>

        {timer > 0 ? (
          <p className="timer">
            Resend OTP in {timer}s
          </p>
        ) : (
          <button
            className="resend-btn"
            onClick={handleResend}
          >
            Resend OTP
          </button>
        )}

      </div>

    </div>
  );
}

export default VerifyOTP;
