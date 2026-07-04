import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/login.css";
import logo from "../assets/navkar-logo.png";
import classroom from "../assets/classroom.jpg";
import { loginAdmin } from "../Services/authService";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const data = await loginAdmin({ email, password });
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
      navigate("/admin-dashboard");
    } catch {
      setMessage("Invalid administrator credentials");
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-left">
        <div className="bg-image" style={{ backgroundImage: `url(${classroom})` }}></div>
        <div className="overlay"></div>

        <div className="brand-card">
          <img src={logo} alt="Navkar Classes" className="brand-logo" />
        </div>
      </div>

      <div className="login-right">
        <div className="login-header-text">
          <h1>Administrator Login</h1>
          <p>Sign in to manage the Navkar Classes system</p>
        </div>

        {message && <p className="msg">{message}</p>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label className="input-label">Username</label>
            <div className="input-wrapper">
              <i className="fas fa-user input-icon"></i>
              <input
                type="email"
                className="form-input with-icon"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="input-label">Password</label>
            <div className="input-wrapper">
              <i className="fas fa-lock input-icon"></i>
              <input
                type={showPassword ? "text" : "password"}
                className="form-input with-icon"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

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

          <div className="button-group">
            <button type="submit" className="btn-login">Log in</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
