import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { getProfile, logoutUser } from "../Services/authService";
import "../Styles/dashboard.css";
import "../Styles/pages.css";

const Tests = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState("active");

    const fallbackUser = {
        name: "Student (Demo Mode)",
        role: "student",
        profileImg: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
    };

    // Dummy Active Tests
    const activeTests = [
        { id: 1, title: "Direct Taxation Mock Assessment - Unit 3", subject: "Taxation", duration: "60 Mins", marks: 50, deadline: "20-May-2026 11:59 PM" },
        { id: 2, title: "Company Law & Provisions Test", subject: "Law", duration: "45 Mins", marks: 40, deadline: "23-May-2026 06:00 PM" },
        { id: 3, title: "Advanced Accounts - Consolidated Balance Sheet", subject: "Accounting", duration: "120 Mins", marks: 100, deadline: "25-May-2026 08:30 AM" }
    ];

    // Dummy Completed Tests
    const completedTests = [
        { id: 4, title: "Audit Planning and Standards MCQ Test", subject: "Auditing", score: "38 / 40", percentage: 95, date: "15-May-2026", status: "PASSED" },
        { id: 5, title: "Partnership Valuation Term Test", subject: "Accounting", score: "72 / 100", percentage: 72, date: "10-May-2026", status: "PASSED" },
        { id: 6, title: "Negotiable Instruments Short Test", subject: "Law", score: "18 / 30", percentage: 60, date: "02-May-2026", status: "PASSED" }
    ];

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                setUser(fallbackUser);
                return;
            }
            try {
                const userData = await getProfile(token);
                setUser(userData);
            } catch (error) {
                console.warn("Failed to load profile from API, falling back to mock user", error);
                setUser(fallbackUser);
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

    const handleStartTest = (testTitle) => {
        const confirmStart = window.confirm(`Important Notice:\n\nThis will open the online exam screen in full-screen lockdown mode.\nDo you want to start "${testTitle}" now?`);
        if (confirmStart) {
            alert("Online exam window successfully initialized. (Simulating Navkar digital portal proctored exam screen...)");
        }
    };

    return (
        <div className="dashboard-layout">
            <Navbar role="student" user={user} onLogout={handleLogout} />

            <div className="dashboard-main-container">
                <div className="page-container">
                    
                    {/* Header */}
                    <div className="page-header">
                        <h2><i className="fas fa-file-signature"></i> Online Tests & Mock Exams</h2>
                    </div>

                    {/* Tab Selectors */}
                    <div className="notification-tabs" style={{ marginBottom: "25px", borderBottom: "1px solid #cbd5e1" }}>
                        <button 
                            onClick={() => setActiveTab("active")}
                            className={`tab-btn ${activeTab === "active" ? "active" : ""}`}
                            style={{ paddingBottom: "10px", fontSize: "14px", fontWeight: "bold" }}
                        >
                            Active & Upcoming Tests ({activeTests.length})
                        </button>
                        <button 
                            onClick={() => setActiveTab("completed")}
                            className={`tab-btn ${activeTab === "completed" ? "active" : ""}`}
                            style={{ paddingBottom: "10px", fontSize: "14px", fontWeight: "bold" }}
                        >
                            Completed Assessments ({completedTests.length})
                        </button>
                    </div>

                    {activeTab === "active" ? (
                        /* Active Tests Grid */
                        activeTests.length > 0 ? (
                            <div className="tests-grid">
                                {activeTests.map(test => (
                                    <div key={test.id} className="test-item-card active">
                                        <div className="test-header">
                                            <h3>{test.title}</h3>
                                            <span className="portal-badge info" style={{ whiteSpace: "nowrap" }}>{test.subject}</span>
                                        </div>

                                        <div className="test-meta-info">
                                            <span><i className="far fa-clock"></i> Duration: <strong>{test.duration}</strong></span>
                                            <span><i className="far fa-check-square"></i> Max Marks: <strong>{test.marks} Marks</strong></span>
                                            <span style={{ color: "#e74c3c" }}><i className="far fa-calendar-times"></i> Deadline: <strong>{test.deadline}</strong></span>
                                        </div>

                                        <div className="test-footer">
                                            <span style={{ fontSize: "11px", color: "#718096" }}>Proctored Session</span>
                                            <button 
                                                onClick={() => handleStartTest(test.title)}
                                                className="portal-btn danger sm"
                                            >
                                                <i className="fas fa-play" style={{ fontSize: "10px" }}></i> Start Assessment
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="portal-card">
                                <div className="no-record-box">
                                    <i className="fas fa-laugh-beam"></i>
                                    <h4>No Active Tests!</h4>
                                    <p>You have no pending online tests or assignments scheduled for today.</p>
                                </div>
                            </div>
                        )
                    ) : (
                        /* Completed Tests Grid */
                        completedTests.length > 0 ? (
                            <div className="tests-grid">
                                {completedTests.map(test => (
                                    <div key={test.id} className="test-item-card completed">
                                        <div className="test-header">
                                            <h3>{test.title}</h3>
                                            <span className="portal-badge success" style={{ whiteSpace: "nowrap" }}>{test.subject}</span>
                                        </div>

                                        <div className="test-meta-info" style={{ marginBottom: "12px" }}>
                                            <span><i className="far fa-calendar-check"></i> Date Submitted: <strong>{test.date}</strong></span>
                                            <span><i className="fas fa-check-double"></i> Result Status: <strong style={{ color: "#2ecc71" }}>{test.status}</strong></span>
                                        </div>

                                        <div className="test-footer">
                                            <div className="test-score">
                                                Obtained Score: <span>{test.score}</span>
                                            </div>
                                            <span className="portal-badge success" style={{ borderRadius: "4px" }}>
                                                {test.percentage}% Score
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="portal-card">
                                <div className="no-record-box">
                                    <i className="fas fa-folder-open"></i>
                                    <h4>No Completed Assessments</h4>
                                    <p>Your previous online test history logs are empty.</p>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default Tests;
