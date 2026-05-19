import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/login.css";
import logo from "../assets/navkar-logo.png";
import classroom from "../assets/classroom.jpg";
import googleLogo from "../assets/google-logo.png";
import { loginUser, forgotPassword } from "../Services/authService";

const Login = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState("student"); // Default to student
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [forgot, setForgot] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const data = await loginUser({ email, password, role });
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", role);

      if (role === "student") {
        navigate("/dashboard");
      } else if (role === "admin") {
        navigate("/admin-dashboard");
      }
    } catch {
      setMessage("Invalid credentials");
    }
  };

  const handleForgot = async () => {
    try {
      await forgotPassword({ email });
      setMessage("Password reset link sent to email");
    } catch {
      setMessage("Email not registered");
    }
  };

  return (
    <div className="login-wrapper">
      {/* Left Side - Brand Card */}
      <div className="login-left">
        <div className="bg-image" style={{ backgroundImage: `url(${classroom})` }}></div>
        <div className="overlay"></div>

        <div className="brand-card">
          <img src={logo} alt="Navkar Classes" className="brand-logo" />
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="login-right">

        <div className="login-header-text">
          <h1>Welcome Back</h1>
          <p>Please sign in to your account</p>
        </div>

        {message && <p className="msg">{message}</p>}

        {!forgot ? (
          <form onSubmit={handleLogin} className="login-form">

            {/* Role Selection */}
            <div className="form-group role-group">
              <label className="input-label">Role</label>
              <div className="radio-options">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={role === "admin"}
                    onChange={() => setRole("admin")}
                  />
                  Staff
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="role"
                    value="student"
                    checked={role === "student"}
                    onChange={() => setRole("student")}
                  />
                  Student
                </label>
              </div>
            </div>

            {/* Username Input */}
            <div className="form-group">
              <label className="input-label">Username</label>
              <div className="input-wrapper">
                <i className="fas fa-user input-icon"></i>
                <input
                  type="email"
                  className="form-input with-icon"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="form-group">
              <label className="input-label">Password</label>
              <div className="input-wrapper">
                <i className="fas fa-lock input-icon"></i>
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input with-icon"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Show Password */}
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={() => setShowPassword(!showPassword)}
                />
                Show Password
              </label>
            </div>

            {/* Buttons */}
            <div className="button-group">
              <button type="submit" className="btn-login">Login</button>
              <button type="button" className="btn-forgot" onClick={() => setForgot(true)}>Forgot Password</button>
            </div>

            {/* Divider */}
            <div className="divider">
              <span>Or continue with</span>
            </div>

            {/* Google Sign In */}
            <button type="button" className="google-signin-btn">
              <img src={googleLogo} alt="Google" />
              Sign in with Google
            </button>

            {/* Register Link */}
            <div className="divider" style={{ margin: '15px 0', border: 'none' }}></div>
            <p style={{ textAlign: 'center', fontSize: '14px', color: '#666' }}>
              Don't have an account? <span style={{ color: '#2c7a7b', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => navigate("/register")}>Register</span>
            </p>

          </form>
        ) : (
          <div className="forgot-container">
            <h3>Reset Password</h3>
            <div className="form-group">
              <label className="input-label">Email Address</label>
              <div className="input-wrapper">
                <i className="fas fa-envelope input-icon"></i>
                <input
                  type="email"
                  className="form-input with-icon"
                  placeholder="Enter registered email"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <button onClick={handleForgot} className="btn-login full-width">Send Reset Link</button>
            <p className="link-back" onClick={() => setForgot(false)}>
              Back to Login
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
