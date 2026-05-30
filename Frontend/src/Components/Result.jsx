import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { getProfile, logoutUser } from "../Services/authService";
import logo from "../assets/navkar-logo.png";
import "../Styles/dashboard.css";
import "../Styles/pages.css";

const Result = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [selectedTerm, setSelectedTerm] = useState("MID-2025");

    const fallbackUser = {
        id: "STU654321",
        name: "John Doe",
        role: "student",
        profileImg: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
        batch: "Standard 10 - Batch A"
    };

    const termsList = [
        { id: "MID-2025", name: "Mid-Semester Examination - September 2025" },
        { id: "PRE-MOCK-2026", name: "Pre-Mock Board Examination - March 2026" }
    ];

    // Dummy Results Data for Mid-Semester Exam 2025
    const resultsMid2025 = [
        { code: "MTH101", subject: "Mathematics / Algebra", max: 100, obtained: 82, grade: "A", status: "Pass" },
        { code: "SCI102", subject: "Science & Technology", max: 100, obtained: 74, grade: "B+", status: "Pass" },
        { code: "SST103", subject: "Social Studies & History", max: 100, obtained: 91, grade: "O", status: "Pass" },
        { code: "ENG104", subject: "English Literature", max: 100, obtained: 68, grade: "B", status: "Pass" }
    ];

    // Dummy Results Data for Pre-Mock Board 2026
    const resultsMock2026 = [
        { code: "MTH101", subject: "Mathematics / Algebra", max: 100, obtained: 88, grade: "A+", status: "Pass" },
        { code: "SCI102", subject: "Science & Technology", max: 100, obtained: 65, grade: "B", status: "Pass" },
        { code: "SST103", subject: "Social Studies & History", max: 100, obtained: 95, grade: "O", status: "Pass" },
        { code: "ENG104", subject: "English Literature", max: 100, obtained: 85, grade: "A", status: "Pass" }
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

    const getResults = () => {
        return selectedTerm === "MID-2025" ? resultsMid2025 : resultsMock2026;
    };

    const currentResults = getResults();
    const totalMax = currentResults.reduce((sum, item) => sum + item.max, 0);
    const totalObtained = currentResults.reduce((sum, item) => sum + item.obtained, 0);
    const overallPercentage = Math.round((totalObtained / totalMax) * 100);
    const cgpa = (overallPercentage / 10).toFixed(1);

    const handlePrint = () => {
        window.print();
    };

    const studentId = user ? (user._id ?? user.id ?? "STU654321") : "STU654321";
    const sliceId = String(studentId).slice(-6).toUpperCase();

    return (
        <div className="dashboard-layout">
            <Navbar role="student" user={user} onLogout={handleLogout} />

            <div className="dashboard-main-container">
                <div className="page-container">
                    
                    {/* Header */}
                    <div className="page-header no-print">
                        <h2><i className="fas fa-poll"></i> Examination Results</h2>
                        
                        <div className="header-actions">
                            <select 
                                className="select-filter"
                                value={selectedTerm}
                                onChange={(e) => setSelectedTerm(e.target.value)}
                            >
                                {termsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>

                            <button onClick={handlePrint} className="portal-btn primary">
                                <i className="fas fa-print"></i> Print Marksheet
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="summary-grid no-print">
                        <div className="summary-card success">
                            <div className="summary-card-icon">
                                <i className="fas fa-award"></i>
                            </div>
                            <div className="summary-card-details">
                                <h4>Overall Class Score</h4>
                                <p>{overallPercentage}%</p>
                            </div>
                        </div>

                        <div className="summary-card primary">
                            <div className="summary-card-icon">
                                <i className="fas fa-star"></i>
                            </div>
                            <div className="summary-card-details">
                                <h4>CGPA Grade</h4>
                                <p>{cgpa} / 10.0</p>
                            </div>
                        </div>

                        <div className="summary-card info">
                            <div className="summary-card-icon">
                                <i className="fas fa-book-open"></i>
                            </div>
                            <div className="summary-card-details">
                                <h4>Passed Papers</h4>
                                <p>{currentResults.filter(r => r.status === "Pass").length} / {currentResults.length}</p>
                            </div>
                        </div>

                        <div className="summary-card warning">
                            <div className="summary-card-icon">
                                <i className="fas fa-trophy"></i>
                            </div>
                            <div className="summary-card-details">
                                <h4>Passing Status</h4>
                                <p style={{ color: "#2ecc71" }}>PASSED</p>
                            </div>
                        </div>
                    </div>

                    {/* Results Card Marksheet */}
                    <div className="portal-card" style={{ background: "white", padding: "40px" }}>
                        <style>{`
                            @media print {
                                .navbar, .no-print, .page-header, .header-actions, .summary-grid {
                                    display: none !important;
                                }
                                body {
                                    background: white !important;
                                    color: black !important;
                                }
                                .dashboard-main-container {
                                    padding: 0 !important;
                                    margin: 0 !important;
                                    max-width: 100% !important;
                                }
                                .portal-card {
                                    box-shadow: none !important;
                                    border: 2px solid #000 !important;
                                    padding: 20px !important;
                                    margin: 0 !important;
                                }
                                .portal-table th {
                                    background-color: #f1f5f9 !important;
                                    border-bottom: 2px solid #000 !important;
                                }
                            }
                        `}</style>

                        {/* Marksheet Header */}
                        <div style={{ display: "flex", alignItems: "center", borderBottom: "2px solid #343a40", paddingBottom: "15px", marginBottom: "20px" }}>
                            <img src={logo} alt="Navkar Logo" style={{ height: "55px", marginRight: "20px", background: "#f8fafc", padding: "4px", borderRadius: "4px", border: "1px solid #cbd5e1" }} />
                            <div style={{ flex: "1" }}>
                                <h3 style={{ margin: "0 0 4px 0", color: "var(--primary-color)", fontSize: "20px", textTransform: "uppercase", fontWeight: "700" }}>Navkar Classes</h3>
                                <p style={{ margin: "0", fontSize: "12px", color: "#4a5568", fontWeight: "500" }}>Academic Transcript & Progress Report</p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <span className="portal-badge success" style={{ padding: "5px 12px", fontSize: "12px" }}>OFFICIAL PASS</span>
                            </div>
                        </div>

                        {/* Student Info Details */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px", fontSize: "13px", marginBottom: "25px", background: "#f8fafc", padding: "15px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                            <div>
                                <span style={{ color: "#718096", display: "block", fontSize: "11px", textTransform: "uppercase" }}>Student Name</span>
                                <strong>{user ? user.name : "Loading..."}</strong>
                            </div>
                            <div>
                                <span style={{ color: "#718096", display: "block", fontSize: "11px", textTransform: "uppercase" }}>Student Reg ID</span>
                                <strong>{sliceId}</strong>
                            </div>
                            <div>
                                <span style={{ color: "#718096", display: "block", fontSize: "11px", textTransform: "uppercase" }}>Current Batch</span>
                                <strong>{user?.batch || "Standard 10 - Batch A"}</strong>
                            </div>
                            <div>
                                <span style={{ color: "#718096", display: "block", fontSize: "11px", textTransform: "uppercase" }}>Exam Name</span>
                                <strong>{selectedTerm === "MID-2025" ? "Mid-Sem September 2025" : "Pre-Mock March 2026"}</strong>
                            </div>
                            <div>
                                <span style={{ color: "#718096", display: "block", fontSize: "11px", textTransform: "uppercase" }}>Issue Date</span>
                                <strong>18-May-2026</strong>
                            </div>
                            <div>
                                <span style={{ color: "#718096", display: "block", fontSize: "11px", textTransform: "uppercase" }}>Overall Grade</span>
                                <strong style={{ color: "#2ecc71" }}>{overallPercentage >= 85 ? "O (Outstanding)" : overallPercentage >= 75 ? "A (Excellent)" : "B (Good)"}</strong>
                            </div>
                        </div>

                        {/* Marksheet Table */}
                        <div className="table-responsive">
                            <table className="portal-table" style={{ border: "1px solid #cbd5e1" }}>
                                <thead>
                                    <tr style={{ background: "#f8fafc" }}>
                                        <th>Code</th>
                                        <th>Subject Title</th>
                                        <th>Maximum Marks</th>
                                        <th>Marks Obtained</th>
                                        <th>Assigned Grade</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentResults.map((row, idx) => (
                                        <tr key={idx}>
                                            <td><strong>{row.code}</strong></td>
                                            <td style={{ color: "#2d3748", fontWeight: "500" }}>{row.subject}</td>
                                            <td>{row.max}</td>
                                            <td style={{ fontWeight: "bold" }}>{row.obtained}</td>
                                            <td><span className="portal-badge info" style={{ borderRadius: "4px" }}>{row.grade}</span></td>
                                            <td><span className="portal-badge success">{row.status}</span></td>
                                        </tr>
                                    ))}
                                    {/* Summary Total Row */}
                                    <tr style={{ background: "#f8fafc", fontWeight: "bold", borderTop: "2px solid #cbd5e1" }}>
                                        <td colSpan="2" style={{ textAlign: "right" }}>GRAND TOTAL:</td>
                                        <td>{totalMax}</td>
                                        <td style={{ color: "var(--primary-color)", fontSize: "16px" }}>{totalObtained}</td>
                                        <td colSpan="2">
                                            Percentage: <span style={{ color: "#2ecc71" }}>{overallPercentage}%</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Marksheet Signatures */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "40px", fontSize: "12px" }}>
                            <div>
                                <p style={{ margin: "0", color: "#718096" }}>* This is a digitally generated marksheet by Navkar Classes.</p>
                                <p style={{ margin: "3px 0 0 0", color: "#a0aec0" }}>Verification Hash: NAV-HASH-{(sliceId + totalObtained)}</p>
                            </div>
                            <div style={{ textAlign: "center", width: "160px" }}>
                                <div style={{ borderTop: "1px solid #cbd5e1", marginTop: "40px", paddingTop: "5px", fontWeight: "600", color: "#4a5568" }}>Controller of Evaluation</div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Result;
