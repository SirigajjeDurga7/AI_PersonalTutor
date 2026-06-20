// VerifyLoginOTP.jsx - Redirect stub (not used in current routing)
// The primary OTP verification is handled by VerifyOTP.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function VerifyLoginOTP() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/");
  }, []);
  return null;
}

export default VerifyLoginOTP;
