import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { getProfile, logoutUser } from "../Services/authService";
import "../Styles/dashboard.css";
import "../Styles/pages.css";

const Timetable = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [selectedDay, setSelectedDay] = useState("All");
    const [selectedSubject, setSelectedSubject] = useState("All");

    // Dynamic mock user for offline fallback
    const fallbackUser = {
        name: "Student (Demo Mode)",
        role: "student",
        profileImg: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
    };

    // Dummy timetable data
    const lectures = [
        { id: 1, day: "Monday", subject: "Advanced Accounting", faculty: "Prof. R. C. Shah", time: "08:30 AM - 10:30 AM", room: "L-102" },
        { id: 2, day: "Monday", subject: "Corporate & Other Laws", faculty: "Prof. N. K. Vyas", time: "11:00 AM - 01:00 PM", room: "L-105" },
        { id: 3, day: "Tuesday", subject: "Taxation (Direct Tax)", faculty: "CA Harish Mehta", time: "08:30 AM - 10:30 AM", room: "L-102" },
        { id: 4, day: "Tuesday", subject: "Strategic Management", faculty: "Prof. Aniket Trivedi", time: "11:00 AM - 01:00 PM", room: "L-108" },
        { id: 5, day: "Wednesday", subject: "Advanced Accounting", faculty: "Prof. R. C. Shah", time: "08:30 AM - 10:30 AM", room: "L-102" },
        { id: 6, day: "Wednesday", subject: "Corporate & Other Laws", faculty: "Prof. N. K. Vyas", time: "11:00 AM - 01:00 PM", room: "L-105" },
        { id: 7, day: "Thursday", subject: "Taxation (Indirect Tax)", faculty: "CA Harish Mehta", time: "08:30 AM - 10:30 AM", room: "L-102" },
        { id: 8, day: "Thursday", subject: "Cost & Management Accounting", faculty: "Prof. Suresh Patel", time: "11:00 AM - 01:00 PM", room: "L-201" },
        { id: 9, day: "Friday", subject: "Cost & Management Accounting", faculty: "Prof. Suresh Patel", time: "08:30 AM - 10:30 AM", room: "L-201" },
        { id: 10, day: "Friday", subject: "Auditing & Assurance", faculty: "CA Preeti Desai", time: "11:00 AM - 01:00 PM", room: "L-105" },
        { id: 11, day: "Saturday", subject: "Auditing & Assurance", faculty: "CA Preeti Desai", time: "08:30 AM - 10:30 AM", room: "L-105" },
        { id: 12, day: "Saturday", subject: "Weekly Assessment Test", faculty: "Exam Coordinator", time: "11:00 AM - 01:00 PM", room: "Exam Hall A" }
    ];

    // Filter lists
    const days = ["All", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const subjects = ["All", "Advanced Accounting", "Corporate & Other Laws", "Taxation (Direct Tax)", "Taxation (Indirect Tax)", "Cost & Management Accounting", "Auditing & Assurance", "Strategic Management", "Weekly Assessment Test"];

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                // If no token, set fallback user for demo purposes or redirect
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

    // Filter logic
    const filteredLectures = lectures.filter(lec => {
        const matchDay = selectedDay === "All" || lec.day === selectedDay;
        const matchSubj = selectedSubject === "All" || lec.subject === selectedSubject;
        return matchDay && matchSubj;
    });

    return (
        <div className="dashboard-layout">
            <Navbar role="student" user={user} onLogout={handleLogout} />

            <div className="dashboard-main-container">
                <div className="page-container">
                    {/* Header */}
                    <div className="page-header">
                        <h2><i className="fas fa-calendar-alt"></i> Class Timetable</h2>
                        
                        <div className="header-actions">
                            <div className="portal-form-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px" }}>
                                <label style={{ whiteSpace: "nowrap" }}>Filter Day:</label>
                                <select 
                                    className="select-filter" 
                                    value={selectedDay} 
                                    onChange={(e) => setSelectedDay(e.target.value)}
                                >
                                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>

                            <div className="portal-form-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px" }}>
                                <label style={{ whiteSpace: "nowrap" }}>Filter Subject:</label>
                                <select 
                                    className="select-filter" 
                                    value={selectedSubject} 
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                >
                                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="portal-card">
                        {filteredLectures.length > 0 ? (
                            <div className="table-responsive">
                                <table className="portal-table">
                                    <thead>
                                        <tr>
                                            <th>Day</th>
                                            <th>Subject Name</th>
                                            <th>Faculty</th>
                                            <th>Lecture Time</th>
                                            <th>Room / Location</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLectures.map(lec => (
                                            <tr key={lec.id}>
                                                <td><strong>{lec.day}</strong></td>
                                                <td style={{ color: "#007bff", fontWeight: "500" }}>{lec.subject}</td>
                                                <td>{lec.faculty}</td>
                                                <td><i className="far fa-clock" style={{ marginRight: "6px", color: "#718096" }}></i>{lec.time}</td>
                                                <td><span className="portal-badge info">{lec.room}</span></td>
                                                <td><span className="portal-badge success">Active</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="no-record-box">
                                <i className="fas fa-calendar-times"></i>
                                <h4>No Lectures Scheduled</h4>
                                <p>There are no lectures matching your selected day and subject filters.</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Notice Card */}
                    <div className="portal-card blue-theme" style={{ marginTop: "10px" }}>
                        <h4 style={{ margin: "0 0 10px 0", color: "#007bff", display: "flex", alignItems: "center", gap: "8px" }}>
                            <i className="fas fa-info-circle"></i> Important Instructions:
                        </h4>
                        <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#4a5568", lineHeight: "1.6" }}>
                            <li>Students must arrive at least 10 minutes prior to the scheduled lecture.</li>
                            <li>Weekly Assessment Test is mandatory for all students on Saturday.</li>
                            <li>Any sudden updates to classroom assignments will be notified via the Notification panel.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Timetable;
