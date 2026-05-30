import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import NotificationPanel from "./NotificationPanel";
import "../Styles/dashboard.css";
import { getProfile, logoutUser } from "../Services/authService";

// --- TEACHER PROFILE CARD ---
const TeacherProfileCard = ({ user }) => {
    if (!user) return <div className="student-profile-card">Loading...</div>;

    const profileId = user._id ?? user.id;
    const displayId = profileId ? String(profileId).slice(-6).toUpperCase() : "N/A";

    return (
        <div className="student-profile-card">
            <div className="profile-image-container">
                <img
                    src={user.profileImg || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"}
                    alt={user.name || user.fullName}
                    className="profile-main-img"
                />
            </div>

            <div className="profile-info">
                <h2 className="profile-name">{user.name || user.fullName}</h2>
                <span className="status-badge" style={{
                    backgroundColor: user.status === "Active" ? "#c6f6d5" : "#fed7d7",
                    color: user.status === "Active" ? "#276749" : "#c53030"
                }}>
                    {user.status || "Active"}
                </span>

                <div className="profile-details-list">
                    <p className="profile-detail-item">
                        <strong>Faculty / Teacher</strong>
                    </p>
                    <p className="profile-detail-item highlight">
                        TCH-{displayId}
                    </p>
                    <p className="profile-detail-item small">
                        Mobile: {user.mobile || "—"}
                    </p>
                    <p className="profile-detail-item small email">
                        Email: {user.email}
                    </p>
                </div>

                {/* Quick Stats */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    marginTop: "20px",
                    padding: "15px",
                    background: "#f8fafc",
                    borderRadius: "10px"
                }}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "22px", fontWeight: "700", color: "#3182ce" }}>
                            <i className="fas fa-chalkboard-teacher"></i>
                        </div>
                        <div style={{ fontSize: "11px", color: "#718096", marginTop: "4px" }}>Manage Classes</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "22px", fontWeight: "700", color: "#38a169" }}>
                            <i className="fas fa-tasks"></i>
                        </div>
                        <div style={{ fontSize: "11px", color: "#718096", marginTop: "4px" }}>Grade Tests</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "22px", fontWeight: "700", color: "#d69e2e" }}>
                            <i className="fas fa-book"></i>
                        </div>
                        <div style={{ fontSize: "11px", color: "#718096", marginTop: "4px" }}>Upload Materials</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "22px", fontWeight: "700", color: "#e53e3e" }}>
                            <i className="fas fa-clipboard-check"></i>
                        </div>
                        <div style={{ fontSize: "11px", color: "#718096", marginTop: "4px" }}>Mark Attendance</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN TEACHER DASHBOARD ---
const TeacherDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem("token");
            const storedRole = localStorage.getItem("role");

            if (!token || storedRole !== "teacher") {
                navigate("/");
                return;
            }

            try {
                const userData = await getProfile(token);
                setUser(userData);
            } catch (error) {
                console.error("Failed to load teacher profile", error);
                navigate("/");
            }
        };
        fetchProfile();
    }, [navigate]);

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

    return (
        <div className="dashboard-layout">
            <Navbar role="teacher" user={user} onLogout={handleLogout} />

            <div className="dashboard-main-container">
                <div className="dashboard-header-title">
                    <h2>
                        Teacher Dashboard{" "}
                        <span className="student-name-light">
                            {user ? (user.name || user.fullName) : "Loading..."}
                        </span>
                    </h2>
                </div>

                <div className="dashboard-grid">
                    {/* Left Column: Profile */}
                    <div className="grid-column left-col">
                        <TeacherProfileCard user={user} />
                    </div>

                    {/* Right Column: Notifications */}
                    <div className="grid-column right-col">
                        <NotificationPanel />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;
