import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import StudentProfile from "./StudentProfile";
import NotificationPanel from "./NotificationPanel";
import "../Styles/dashboard.css";
import profileImg from "../assets/classroom.jpg"; // Placeholder

const StudentDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState({ name: "Student", email: "" });

    useEffect(() => {
        const token = localStorage.getItem("token");
        const role = localStorage.getItem("role");

        if (!token || role !== "student") {
            navigate("/");
        }

        // Mock Data
        setUser({
            name: "SHAH HEVAL SAURABH",
            course: "PIET-1 - BTech - CSE (Semester - 7)",
            id: "2203031050600",
            enrollment: "489151946194",
            dob: "16-04-2005",
            mobile: "9054621078 | 8000222004",
            motherName: "Kaksha",
            email: "hevalshah2056@gmail.com",
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
            <Navbar user={user} onLogout={handleLogout} />

            <div className="dashboard-main-container">
                <div className="dashboard-header-title">
                    <h2>Dashboard <span className="student-name-light">{user.name}</span></h2>
                </div>

                <div className="dashboard-grid">
                    {/* Left Column: Profile & Mobile App */}
                    <div className="grid-column left-col">
                        <StudentProfile user={user} />

                        <div className="mobile-app-card">
                            <div className="mobile-content">
                                <i className="fas fa-mobile-alt mobile-icon"></i>
                                <h3>Activate Your Mobile Application</h3>
                                <button className="activate-btn">Activate</button>
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

export default StudentDashboard;
