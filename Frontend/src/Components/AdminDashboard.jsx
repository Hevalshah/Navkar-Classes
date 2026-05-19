import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import "../Styles/dashboard.css";
import profileImg from "../assets/classroom.jpg"; // Placeholder
import { logoutUser } from "../Services/authService";

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
            <Navbar user={user} onLogout={handleLogout} role="admin" />

            <div className="dashboard-main-container">
                <div className="dashboard-header-title">
                    <h2>Dashboard <span className="student-name-light">{user.name}</span></h2>
                </div>

            </div>
        </div>
    );
};

export default AdminDashboard;
