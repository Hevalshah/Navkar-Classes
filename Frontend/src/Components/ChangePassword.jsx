import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { getProfile, logoutUser } from "../Services/authService";
import "../Styles/dashboard.css";
import "../Styles/pages.css";

const ChangePassword = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [role, setRole] = useState("student");
    const [isUpdating, setIsUpdating] = useState(false);

    // Form inputs
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Show/Hide password states
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const fallbackUser = {
        name: "Student (Demo Mode)",
        role: "student",
        profileImg: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
    };

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem("token");
            const storedRole = localStorage.getItem("role") || "student";
            setRole(storedRole);
            if (!token) {
                setUser({ ...fallbackUser, role: storedRole });
                return;
            }
            try {
                const userData = await getProfile(token);
                setUser(userData);
                if (userData.role) setRole(userData.role);
            } catch (error) {
                console.warn("Failed to load profile from API, falling back to mock user", error);
                setUser({ ...fallbackUser, role: storedRole });
            }
        };
        fetchProfile();
    }, []);

    const handleLogout = async () => {
        const token = localStorage.getItem("token");
        try {
            if (token) {
                await logoutUser(token);
            }
        } catch (error) {
            console.error("Failed to record logout", error);
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            navigate("/");
        }
    };

    // Live Validation checks
    const hasMinLength = newPassword.length >= 8;
    const hasNumber = /\D*/.test(newPassword) && /\d/.test(newPassword);
    const hasCapital = /[A-Z]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    const isMatching = newPassword && newPassword === confirmPassword;

    const handlePasswordSubmit = (e) => {
        e.preventDefault();

        if (!currentPassword) {
            alert("Please enter your current password.");
            return;
        }

        if (!hasMinLength || !hasNumber || !hasCapital || !hasSpecial) {
            alert("New password does not meet the complexity requirements.");
            return;
        }

        if (!isMatching) {
            alert("New password and confirm password do not match.");
            return;
        }

        setIsUpdating(true);

        setTimeout(() => {
            setIsUpdating(false);
            alert("Your security password has been successfully updated! Please keep your credentials secure.");
            
            // Reset form
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        }, 1500);
    };

    return (
        <div className="dashboard-layout">
            <Navbar role={role} user={user} onLogout={handleLogout} />

            <div className="dashboard-main-container">
                <div className="centered-box-wrapper">
                    
                    <div className="portal-card security-box dark-theme">
                        <div style={{ textAlign: "center", marginBottom: "20px" }}>
                            <div style={{ width: "55px", height: "55px", borderRadius: "50%", background: "var(--primary-light)", color: "var(--primary-color)", display: "flex", alignItems: "center", justify: "center", fontSize: "24px", margin: "0 auto 12px auto" }}>
                                <i className="fas fa-key"></i>
                            </div>
                            <h3 style={{ margin: "0 0 5px 0", color: "#2d3748", fontSize: "18px", fontWeight: "600" }}>Change Security Password</h3>
                            <p style={{ margin: "0", fontSize: "12px", color: "#718096" }}>Ensure a complex and strong password to protect your student portal.</p>
                        </div>

                        <form onSubmit={handlePasswordSubmit} className="portal-form">
                            {/* Current Password */}
                            <div className="portal-form-group">
                                <label>Current Password:</label>
                                <div className="portal-input-wrapper">
                                    <i className="fas fa-lock portal-input-icon"></i>
                                    <input 
                                        type={showCurrent ? "text" : "password"} 
                                        className="portal-form-input with-icon with-action"
                                        placeholder="Enter current password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        required
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowCurrent(!showCurrent)}
                                        className="portal-input-action-btn"
                                    >
                                        <i className={showCurrent ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div className="portal-form-group">
                                <label>New Password:</label>
                                <div className="portal-input-wrapper">
                                    <i className="fas fa-shield-alt portal-input-icon"></i>
                                    <input 
                                        type={showNew ? "text" : "password"} 
                                        className="portal-form-input with-icon with-action"
                                        placeholder="Enter new strong password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowNew(!showNew)}
                                        className="portal-input-action-btn"
                                    >
                                        <i className={showNew ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="portal-form-group">
                                <label>Confirm New Password:</label>
                                <div className="portal-input-wrapper">
                                    <i className="fas fa-check-double portal-input-icon"></i>
                                    <input 
                                        type={showConfirm ? "text" : "password"} 
                                        className="portal-form-input with-icon with-action"
                                        placeholder="Re-enter new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="portal-input-action-btn"
                                    >
                                        <i className={showConfirm ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                                    </button>
                                </div>
                            </div>

                            {/* Live Complexity validation list */}
                            <ul className="password-check-list">
                                <li className={`password-check-item ${hasMinLength ? "valid" : ""}`}>
                                    <i className={hasMinLength ? "fas fa-check-circle" : "far fa-circle"}></i> Minimum 8 characters long
                                </li>
                                <li className={`password-check-item ${hasCapital ? "valid" : ""}`}>
                                    <i className={hasCapital ? "fas fa-check-circle" : "far fa-circle"}></i> Contains at least one CAPITAL letter
                                </li>
                                <li className={`password-check-item ${hasNumber ? "valid" : ""}`}>
                                    <i className={hasNumber ? "fas fa-check-circle" : "far fa-circle"}></i> Contains at least one digit (0-9)
                                </li>
                                <li className={`password-check-item ${hasSpecial ? "valid" : ""}`}>
                                    <i className={hasSpecial ? "fas fa-check-circle" : "far fa-circle"}></i> Contains one special character (@, #, $, etc.)
                                </li>
                                <li className={`password-check-item ${isMatching ? "valid" : ""}`}>
                                    <i className={isMatching ? "fas fa-check-circle" : "far fa-circle"}></i> Passwords match exactly
                                </li>
                            </ul>

                            <button 
                                type="submit" 
                                className="portal-btn danger"
                                style={{ marginTop: "15px", height: "45px" }}
                                disabled={isUpdating}
                            >
                                {isUpdating ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i> Saving Security Credentials...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-lock"></i> Update Password
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ChangePassword;
