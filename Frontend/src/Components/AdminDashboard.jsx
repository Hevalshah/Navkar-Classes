import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import StudentProfile from "./StudentProfile";
import NotificationPanel from "./NotificationPanel";
import "../Styles/dashboard.css";
import profileImg from "../assets/classroom.jpg"; // Placeholder

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState({ name: "Admin", email: "" });

    useEffect(() => {
        const token = localStorage.getItem("token");
        const role = localStorage.getItem("role");

        if (!token || role !== "admin") {
            navigate("/");
        }

        // Mock Data for Admin
        setUser({
            name: "ADMIN USER",
            course: "Faculty - Computer Science",
            id: "EMP001",
            enrollment: "FAC123456",
            dob: "01-01-1980",
            mobile: "9876543210",
            motherName: "N/A",
            email: "admin@navkar.com",
            profileImg: profileImg
        });
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        navigate("/");
    };

    return (
        <div className="dashboard-layout">
            <Navbar user={user} onLogout={handleLogout} role="admin" />

            <div className="dashboard-main-container">
                <div className="dashboard-header-title">
                    <h2>Dashboard <span className="student-name-light">{user.name}</span></h2>
                </div>

                <div className="dashboard-grid">
                    {/* Left Column: Profile */}
                    <div className="grid-column left-col">
                        <StudentProfile user={user} />

                        {/* Admin might not need "Activate Mobile App" but keeping layout consistent for now, or could replace with Admin specific widget */}
                        <div className="mobile-app-card" style={{ backgroundColor: '#2c3e50' }}>
                            <div className="mobile-content">
                                <i className="fas fa-chalkboard-teacher mobile-icon"></i>
                                <h3>Teacher Portal</h3>
                                <button className="activate-btn">Access LMS</button>
                            </div>
                        </div>
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

export default AdminDashboard;
