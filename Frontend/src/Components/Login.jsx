import React, { useState } from "react";
import "../styles/Login.css";
import logo from "../assets/navkar-logo.png";
import classroom from "../assets/classroom.jpg";
import { loginUser, forgotPassword } from "../services/authService";

const Login = () => {
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [forgot, setForgot] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const data = await loginUser({ email, password, role });
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", role);
      alert(`${role.toUpperCase()} Login Successful`);
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
      <div
        className="login-left"
        style={{ backgroundImage: `url(${classroom})` }}
      ></div>

      <div className="login-right">
        <img src={logo} alt="Navkar Classes" className="logo" />

        <div className="role-toggle">
          <button
            className={role === "student" ? "active" : ""}
            onClick={() => setRole("student")}
          >
            Student
          </button>
          <button
            className={role === "admin" ? "active" : ""}
            onClick={() => setRole("admin")}
          >
            Admin
          </button>
        </div>

        {message && <p className="msg">{message}</p>}

        {!forgot ? (
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit">Login</button>
            <p className="link" onClick={() => setForgot(true)}>
              Forgot Password?
            </p>
          </form>
        ) : (
          <div>
            <input
              type="email"
              placeholder="Enter registered email"
              onChange={(e) => setEmail(e.target.value)}
            />
            <button onClick={handleForgot}>Send Reset Link</button>
            <p className="link" onClick={() => setForgot(false)}>
              Back to Login
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
