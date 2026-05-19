import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import StudentProfile from "./StudentProfile";
import NotificationPanel from "./NotificationPanel";
import "../Styles/dashboard.css";
import { getProfile, logoutUser } from "../Services/authService";

const StudentDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                navigate("/");
                return;
            }
            try {
                const userData = await getProfile(token);
                setUser(userData);
            } catch (error) {
                console.error("Failed to load profile", error);
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
            <Navbar role="student" user={user} onLogout={handleLogout} />

            <div className="dashboard-main-container">
                <div className="dashboard-header-title">
                    <h2>Dashboard <span className="student-name-light">{user ? user.name : "Loading..."}</span></h2>
                </div>

                <div className="dashboard-grid">
                    {/* Left Column: Profile */}
                    <div className="grid-column left-col">
                        <StudentProfile user={user} />
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
