import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { getProfile, logoutUser } from "../Services/authService";
import logo from "../assets/navkar-logo.png";
import "../Styles/dashboard.css";
import "../Styles/pages.css";

const AdmitCard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [selectedExam, setSelectedExam] = useState("CA-FOUND-JUN26");

    const fallbackUser = {
        id: "STU654321",
        name: "John Doe",
        role: "student",
        profileImg: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
        batch: "CA Foundation - Batch A"
    };

    const examsList = [
        { id: "CA-FOUND-JUN26", name: "CA Foundation Examination - June 2026" },
        { id: "CA-INTER-NOV26", name: "CA Intermediate Examination - November 2026 (Mock)" }
    ];

    // Dummy schedule data for CA Foundation June 2026
    const scheduleCAFoundation = [
        { paper: "Paper 1", subject: "Principles & Practice of Accounting", date: "22-Jun-2026", day: "Monday", time: "02:00 PM - 05:00 PM", status: "Confirmed" },
        { paper: "Paper 2", subject: "Business Laws & Business Correspondence", date: "24-Jun-2026", day: "Wednesday", time: "02:00 PM - 05:00 PM", status: "Confirmed" },
        { paper: "Paper 3", subject: "Business Mathematics & Logical Reasoning", date: "26-Jun-2026", day: "Friday", time: "02:00 PM - 05:00 PM", status: "Confirmed" },
        { paper: "Paper 4", subject: "Business Economics & Commercial Knowledge", date: "28-Jun-2026", day: "Sunday", time: "02:00 PM - 05:00 PM", status: "Confirmed" }
    ];

    // Dummy schedule data for CA Intermediate Nov 2026
    const scheduleCAIntermediate = [
        { paper: "Group I Paper 1", subject: "Advanced Accounting", date: "02-Nov-2026", day: "Monday", time: "02:00 PM - 05:00 PM", status: "Tentative" },
        { paper: "Group I Paper 2", subject: "Corporate and Other Laws", date: "04-Nov-2026", day: "Wednesday", time: "02:00 PM - 05:00 PM", status: "Tentative" },
        { paper: "Group I Paper 3", subject: "Taxation (Direct & Indirect)", date: "06-Nov-2026", day: "Friday", time: "02:00 PM - 05:00 PM", status: "Tentative" }
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

    const handlePrint = () => {
        window.print();
    };

    const getSchedule = () => {
        return selectedExam === "CA-FOUND-JUN26" ? scheduleCAFoundation : scheduleCAIntermediate;
    };

    const studentId = user ? (user._id ?? user.id ?? "STU654321") : "STU654321";
    const sliceId = String(studentId).slice(-6).toUpperCase();

    return (
        <div className="dashboard-layout">
            <Navbar role="student" user={user} onLogout={handleLogout} />

            <div className="dashboard-main-container">
                <div className="page-container">
                    
                    {/* Header: Hidden during printing */}
                    <div className="page-header no-print">
                        <h2><i className="fas fa-id-card"></i> Examination Admit Card</h2>
                        
                        <div className="header-actions">
                            <select 
                                className="select-filter"
                                value={selectedExam}
                                onChange={(e) => setSelectedExam(e.target.value)}
                            >
                                {examsList.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>

                            <button onClick={handlePrint} className="portal-btn primary">
                                <i className="fas fa-print"></i> Print Admit Card
                            </button>
                        </div>
                    </div>

                    {/* Printable Admit Card Block */}
                    <div className="portal-card admit-card-layout-parent" style={{ background: "#f8fafc", padding: "30px 10px" }}>
                        
                        <div className="admit-card-layout">
                            {/* Printable styles injected directly inside the card for neat printouts */}
                            <style>{`
                                @media print {
                                    body {
                                        background-color: white !important;
                                        color: black !important;
                                    }
                                    .navbar, .no-print, .page-header, .header-actions, .mobile-menu-icon {
                                        display: none !important;
                                    }
                                    .dashboard-main-container {
                                        padding: 0 !important;
                                        margin: 0 !important;
                                        max-width: 100% !important;
                                    }
                                    .portal-card.admit-card-layout-parent {
                                        background: transparent !important;
                                        box-shadow: none !important;
                                        border: none !important;
                                        padding: 0 !important;
                                        margin: 0 !important;
                                    }
                                    .admit-card-layout {
                                        border: 2px solid #000 !important;
                                        box-shadow: none !important;
                                        max-width: 100% !important;
                                        margin: 0 !important;
                                    }
                                    .admit-card-header-text h3 {
                                        color: #000 !important;
                                    }
                                    .portal-table th {
                                        background-color: #f1f5f9 !important;
                                        border-bottom: 2px solid #000 !important;
                                    }
                                    .portal-badge {
                                        border: 1px solid #000 !important;
                                        background: none !important;
                                        color: #000 !important;
                                    }
                                }
                            `}</style>

                            <div className="admit-card-watermark">Navkar</div>

                            {/* Admit Card Header */}
                            <div className="admit-card-header">
                                <img src={logo} alt="Navkar Classes" className="admit-card-logo" />
                                <div className="admit-card-header-text">
                                    <h3>Navkar Classes</h3>
                                    <p>Coaching Classes Student Portal & Examination Board</p>
                                    <p style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", marginTop: "3px" }}>
                                        {selectedExam === "CA-FOUND-JUN26" ? "CA Foundation Term Exam Admit Card" : "CA Intermediate Mock Exam Admit Card"}
                                    </p>
                                </div>
                                <div style={{ width: "60px" }}></div> {/* Balance layout */}
                            </div>

                            {/* Profile Details Grid */}
                            <div className="admit-card-profile-section">
                                <div className="admit-card-details-grid">
                                    <div className="admit-card-detail-box">
                                        <p>Student Name</p>
                                        <span>{user ? user.name : "Loading..."}</span>
                                    </div>
                                    <div className="admit-card-detail-box">
                                        <p>Student ID / Reg No</p>
                                        <span>{sliceId}</span>
                                    </div>
                                    <div className="admit-card-detail-box">
                                        <p>Exam Roll Number</p>
                                        <span>NAV2026{sliceId}</span>
                                    </div>
                                    <div className="admit-card-detail-box">
                                        <p>Course & Batch</p>
                                        <span>{user?.batch || "CA Foundation - Batch A"}</span>
                                    </div>
                                    <div className="admit-card-detail-box" style={{ gridColumn: "span 2" }}>
                                        <p>Examination Center</p>
                                        <span>Navkar Classes Main Campus, Auditorium Hall B, 3rd Floor, Ahmedabad</span>
                                    </div>
                                </div>

                                <div className="admit-card-photo-box">
                                    <img 
                                        src={user?.profileImg || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} 
                                        alt="Profile Photo" 
                                        className="admit-card-photo" 
                                    />
                                    <span style={{ fontSize: "8px", color: "#a0aec0", marginTop: "4px" }}>PHOTO VERIFIED</span>
                                </div>
                            </div>

                            {/* Schedule Table */}
                            <div className="admit-card-schedule-title">Examination Schedule</div>
                            <div className="table-responsive" style={{ zIndex: "1", position: "relative" }}>
                                <table className="portal-table" style={{ border: "1px solid #cbd5e1" }}>
                                    <thead>
                                        <tr style={{ background: "#f8fafc" }}>
                                            <th>Paper</th>
                                            <th>Subject / Description</th>
                                            <th>Exam Date</th>
                                            <th>Day</th>
                                            <th>Time Session</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getSchedule().map((item, idx) => (
                                            <tr key={idx}>
                                                <td><strong>{item.paper}</strong></td>
                                                <td style={{ color: "#2d3748" }}>{item.subject}</td>
                                                <td>{item.date}</td>
                                                <td>{item.day}</td>
                                                <td>{item.time}</td>
                                                <td><span className="portal-badge success">{item.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Admit Card Footer */}
                            <div className="admit-card-footer">
                                <div style={{ fontSize: "10px", color: "#718096", maxWidth: "450px" }}>
                                    <strong>Important Instructions for Candidates:</strong>
                                    <ol style={{ margin: "5px 0 0 0", paddingLeft: "15px", lineHeight: "1.4" }}>
                                        <li>Candidates must carry this print-out along with a valid Government ID card.</li>
                                        <li>Entry is strictly prohibited 30 minutes after exam commencement.</li>
                                        <li>Scientific calculators and electronic devices are strictly not permitted.</li>
                                    </ol>
                                </div>

                                <div className="signature-block">
                                    <div className="signature-line">Controller of Exams</div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdmitCard;
