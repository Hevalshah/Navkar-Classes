import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { getProfile, logoutUser } from "../Services/authService";
import "../Styles/dashboard.css";
import "../Styles/pages.css";

const Attendance = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState("All");

    const fallbackUser = {
        name: "Student (Demo Mode)",
        role: "student",
        profileImg: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
    };

    // Dummy Attendance records
    const attendanceRecords = [
        { id: 1, date: "15-May-2026", subject: "Advanced Accounting", time: "08:30 AM", status: "Present", teacher: "Prof. R. C. Shah" },
        { id: 2, date: "15-May-2026", subject: "Corporate & Other Laws", time: "11:00 AM", status: "Present", teacher: "Prof. N. K. Vyas" },
        { id: 3, date: "14-May-2026", subject: "Taxation (Direct Tax)", time: "08:30 AM", status: "Present", teacher: "CA Harish Mehta" },
        { id: 4, date: "14-May-2026", subject: "Strategic Management", time: "11:00 AM", status: "Absent", teacher: "Prof. Aniket Trivedi" },
        { id: 5, date: "13-May-2026", subject: "Advanced Accounting", time: "08:30 AM", status: "Present", teacher: "Prof. R. C. Shah" },
        { id: 6, date: "13-May-2026", subject: "Corporate & Other Laws", time: "11:00 AM", status: "Present", teacher: "Prof. N. K. Vyas" },
        { id: 7, date: "12-May-2026", subject: "Taxation (Indirect Tax)", time: "08:30 AM", status: "Present", teacher: "CA Harish Mehta" },
        { id: 8, date: "12-May-2026", subject: "Cost & Management Accounting", time: "11:00 AM", status: "Present", teacher: "Prof. Suresh Patel" },
        { id: 9, date: "11-May-2026", subject: "Cost & Management Accounting", time: "08:30 AM", status: "Late", teacher: "Prof. Suresh Patel" },
        { id: 10, date: "11-May-2026", subject: "Auditing & Assurance", time: "11:00 AM", status: "Present", teacher: "CA Preeti Desai" },
        { id: 11, date: "08-May-2026", subject: "Advanced Accounting", time: "08:30 AM", status: "Present", teacher: "Prof. R. C. Shah" },
        { id: 12, date: "08-May-2026", subject: "Corporate & Other Laws", time: "11:00 AM", status: "Present", teacher: "Prof. N. K. Vyas" },
        { id: 13, date: "28-Apr-2026", subject: "Taxation (Direct Tax)", time: "08:30 AM", status: "Present", teacher: "CA Harish Mehta" },
        { id: 14, date: "28-Apr-2026", subject: "Strategic Management", time: "11:00 AM", status: "Present", teacher: "Prof. Aniket Trivedi" },
        { id: 15, date: "27-Apr-2026", subject: "Advanced Accounting", time: "08:30 AM", status: "Absent", teacher: "Prof. R. C. Shah" }
    ];

    const months = ["All", "May 2026", "April 2026"];

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

    // Filter by month
    const filteredRecords = attendanceRecords.filter(rec => {
        if (selectedMonth === "All") return true;
        if (selectedMonth === "May 2026") return rec.date.includes("May-2026");
        if (selectedMonth === "April 2026") return rec.date.includes("Apr-2026");
        return true;
    });

    // Stats calculations
    const totalLectures = filteredRecords.length;
    const presentCount = filteredRecords.filter(r => r.status === "Present").length;
    const lateCount = filteredRecords.filter(r => r.status === "Late").length;
    const absentCount = filteredRecords.filter(r => r.status === "Absent").length;
    const attendancePercentage = totalLectures > 0 
        ? Math.round(((presentCount + lateCount * 0.7) / totalLectures) * 100) 
        : 0;

    const getStatusBadge = (status) => {
        switch (status) {
            case "Present": return <span className="portal-badge success">Present</span>;
            case "Absent": return <span className="portal-badge danger">Absent</span>;
            case "Late": return <span className="portal-badge warning">Late</span>;
            default: return <span className="portal-badge info">{status}</span>;
        }
    };

    return (
        <div className="dashboard-layout">
            <Navbar role="student" user={user} onLogout={handleLogout} />

            <div className="dashboard-main-container">
                <div className="page-container">
                    {/* Header */}
                    <div className="page-header">
                        <h2><i className="fas fa-user-check"></i> Attendance History</h2>
                        
                        <div className="header-actions">
                            <div className="portal-form-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px" }}>
                                <label style={{ whiteSpace: "nowrap" }}>Select Month:</label>
                                <select 
                                    className="select-filter" 
                                    value={selectedMonth} 
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                >
                                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Stats Dashboard */}
                    <div className="summary-grid">
                        <div className="summary-card success">
                            <div className="summary-card-icon">
                                <i className="fas fa-percentage"></i>
                            </div>
                            <div className="summary-card-details">
                                <h4>Attendance Rate</h4>
                                <p>{attendancePercentage}%</p>
                            </div>
                        </div>

                        <div className="summary-card primary">
                            <div className="summary-card-icon">
                                <i className="fas fa-chalkboard-teacher"></i>
                            </div>
                            <div className="summary-card-details">
                                <h4>Total Conducted</h4>
                                <p>{totalLectures}</p>
                            </div>
                        </div>

                        <div className="summary-card info">
                            <div className="summary-card-icon">
                                <i className="fas fa-check-circle"></i>
                            </div>
                            <div className="summary-card-details">
                                <h4>Total Present</h4>
                                <p>{presentCount}</p>
                            </div>
                        </div>

                        <div className="summary-card danger">
                            <div className="summary-card-icon">
                                <i className="fas fa-times-circle"></i>
                            </div>
                            <div className="summary-card-details">
                                <h4>Total Absent</h4>
                                <p>{absentCount}</p>
                            </div>
                        </div>
                    </div>

                    {/* Attendance Table */}
                    <div className="portal-card">
                        {filteredRecords.length > 0 ? (
                            <div className="table-responsive">
                                <table className="portal-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Subject</th>
                                            <th>Faculty In-Charge</th>
                                            <th>Lecture Time</th>
                                            <th>Status</th>
                                            <th>Performance Marker</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRecords.map(rec => (
                                            <tr key={rec.id}>
                                                <td><strong>{rec.date}</strong></td>
                                                <td style={{ fontWeight: "500", color: "#007bff" }}>{rec.subject}</td>
                                                <td>{rec.teacher}</td>
                                                <td><i className="far fa-clock" style={{ marginRight: "6px", color: "#a0aec0" }}></i>{rec.time}</td>
                                                <td>{getStatusBadge(rec.status)}</td>
                                                <td>
                                                    {rec.status === "Present" && <span style={{ color: "#2ecc71" }}><i className="fas fa-smile"></i> Excellent</span>}
                                                    {rec.status === "Late" && <span style={{ color: "#f39c12" }}><i className="fas fa-meh-blank"></i> Warned</span>}
                                                    {rec.status === "Absent" && <span style={{ color: "#e74c3c" }}><i className="fas fa-frown"></i> Action Required</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="no-record-box">
                                <i className="fas fa-clipboard-list"></i>
                                <h4>No Attendance Records Found</h4>
                                <p>There are no attendance records matching your chosen filters.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Attendance;
