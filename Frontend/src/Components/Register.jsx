import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/register.css";
import logo from "../assets/navkar-logo.png";
import classroom from "../assets/classroom.jpg";
import { registerUser } from "../Services/authService";

const Register = () => {
    const navigate = useNavigate();
    const [role, setRole] = useState("student");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        try {
            const data = await registerUser({ email, password, role });
            localStorage.setItem("token", data.token);
            localStorage.setItem("role", role);

            if (role === "student") {
                navigate("/dashboard");
            } else if (role === "admin") {
                navigate("/admin-dashboard");
            }
        } catch (err) {
            setError(err.message || "Registration failed. User may already exist.");
        }
    };

    return (
        <div className="register-wrapper">
            {/* Left Side - Brand Card */}
            <div className="register-left">
                <div className="bg-image" style={{ backgroundImage: `url(${classroom})` }}></div>
                <div className="overlay"></div>

                <div className="brand-card">
                    <img src={logo} alt="Navkar Classes" className="brand-logo" />
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="register-right">

                <div className="register-header-text">
                    <h1>Create Account</h1>
                    <p>Join Navkar Classes today</p>
                </div>

                {error && <p className="msg error">{error}</p>}
                {message && <p className="msg success">{message}</p>}

                <form onSubmit={handleRegister} className="register-form">

                    {/* Role Selection */}
                    <div className="form-group role-group">
                        <label className="input-label">I am a</label>
                        <div className="radio-options">
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
                        </div>
                    </div>

                    {/* Email Input */}
                    <div className="form-group">
                        <label className="input-label">Email Address</label>
                        <div className="input-wrapper">
                            <i className="fas fa-envelope input-icon"></i>
                            <input
                                type="email"
                                className="form-input with-icon"
                                required
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
                                type="password"
                                className="form-input with-icon"
                                required
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Confirm Password Input */}
                    <div className="form-group">
                        <label className="input-label">Confirm Password</label>
                        <div className="input-wrapper">
                            <i className="fas fa-lock input-icon"></i>
                            <input
                                type="password"
                                className="form-input with-icon"
                                required
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Register Button */}
                    <button type="submit" className="btn-register">Register</button>

                    {/* Login Link */}
                    <div className="login-link">
                        <p>Already have an account? <span onClick={() => navigate("/")}>Login</span></p>
                    </div>

                    {/* Footer */}
                    <div className="register-footer">
                        <p>© 2024 Navkar Classes. All rights reserved.</p>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default Register;
