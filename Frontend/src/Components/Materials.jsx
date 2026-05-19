import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { getProfile, logoutUser } from "../Services/authService";
import "../Styles/dashboard.css";
import "../Styles/pages.css";

const Materials = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState("All");
    const [downloadingId, setDownloadingId] = useState(null);

    const fallbackUser = {
        name: "Student (Demo Mode)",
        role: "student",
        profileImg: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
    };

    // Dummy Materials list
    const materialsList = [
        { id: 1, title: "Company Law - Share Capital Notes", subject: "Law", type: "pdf", size: "3.2 MB", date: "15-May-2026", desc: "Detailed handbook focusing on Section 43 to Section 72 under the Companies Act 2013." },
        { id: 2, title: "Advanced Partnership Accounts", subject: "Accounting", type: "pdf", size: "5.8 MB", date: "12-May-2026", desc: "Covers valuation of goodwill, admission, retirement, and death of partners with mock sums." },
        { id: 3, title: "Direct Tax - Salary Head Deductions", subject: "Taxation", type: "pdf", size: "2.1 MB", date: "08-May-2026", desc: "Summary sheet covering Section 16 deductions and allowance exemptions rules for AY 2026-27." },
        { id: 4, title: "Audit Planning and Program", subject: "Auditing", type: "pdf", size: "4.5 MB", date: "04-May-2026", desc: "Covers SA 300, SA 315, SA 320 with audit program sample templates and case studies." },
        { id: 5, title: "GST - Place of Supply Rules Chart", subject: "Taxation", type: "xls", size: "1.4 MB", date: "02-May-2026", desc: "Interactive Excel chart summarizing place of supply rules for Goods and Services." },
        { id: 6, title: "Negotiable Instruments Act PPT", subject: "Law", type: "ppt", size: "12.6 MB", date: "28-Apr-2026", desc: "Presentation slides outlining Promissory Notes, Bills of Exchange, and Cheques with court rulings." },
        { id: 7, title: "Amalgamation and Reconstruction", subject: "Accounting", type: "pdf", size: "6.2 MB", date: "20-Apr-2026", desc: "AS 14 guidelines, calculation of purchase consideration, ledger closing and journal entries." }
    ];

    const subjects = ["All", "Accounting", "Law", "Taxation", "Auditing"];

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

    const handleDownload = (id, filename) => {
        setDownloadingId(id);
        setTimeout(() => {
            setDownloadingId(null);
            alert(`File "${filename}" downloaded successfully! (Demo Mode)`);
        }, 1500);
    };

    // Filter logic
    const filteredMaterials = materialsList.filter(item => {
        return selectedSubject === "All" || item.subject === selectedSubject;
    });

    const getFileIcon = (type) => {
        switch (type) {
            case "pdf": return <i className="fas fa-file-pdf"></i>;
            case "xls": return <i className="fas fa-file-excel"></i>;
            case "ppt": return <i className="fas fa-file-powerpoint"></i>;
            default: return <i className="fas fa-file-alt"></i>;
        }
    };

    const getIconClass = (type) => {
        switch (type) {
            case "pdf": return "material-icon-box"; // Red accent
            case "xls": return "material-icon-box xls"; // Green accent
            case "ppt": return "material-icon-box ppt"; // Orange accent
            default: return "material-icon-box doc"; // Blue accent
        }
    };

    return (
        <div className="dashboard-layout">
            <Navbar role="student" user={user} onLogout={handleLogout} />

            <div className="dashboard-main-container">
                <div className="page-container">
                    
                    {/* Header */}
                    <div className="page-header">
                        <h2><i className="fas fa-book"></i> Study Materials & Notes</h2>
                        
                        <div className="header-actions">
                            <div className="portal-form-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px" }}>
                                <label style={{ whiteSpace: "nowrap" }}>Select Subject:</label>
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

                    {/* Materials Subjects Filter Tabs */}
                    <div className="portal-card" style={{ padding: "10px 20px", marginBottom: "20px", display: "flex", gap: "10px", flexWrap: "wrap", borderTop: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                        {subjects.map(subj => (
                            <button
                                key={subj}
                                onClick={() => setSelectedSubject(subj)}
                                className={`portal-btn ${selectedSubject === subj ? "danger sm" : "outline sm"}`}
                                style={{ borderRadius: "20px", textTransform: "uppercase", fontSize: "11px", fontWeight: "bold" }}
                            >
                                {subj}
                            </button>
                        ))}
                    </div>

                    {/* Materials Cards Grid */}
                    {filteredMaterials.length > 0 ? (
                        <div className="materials-grid">
                            {filteredMaterials.map(mat => (
                                <div key={mat.id} className="material-item-card">
                                    <div>
                                        <div className="material-icon-header">
                                            <div className={getIconClass(mat.type)}>
                                                {getFileIcon(mat.type)}
                                            </div>
                                            <div className="material-meta">
                                                <h3>{mat.title}</h3>
                                                <span>Subject: <strong>{mat.subject}</strong></span>
                                            </div>
                                        </div>

                                        <p className="material-details">{mat.desc}</p>
                                    </div>

                                    <div>
                                        <button 
                                            onClick={() => handleDownload(mat.id, mat.title)}
                                            className="portal-btn primary sm"
                                            style={{ width: "100%", justifyContent: "center" }}
                                            disabled={downloadingId === mat.id}
                                        >
                                            {downloadingId === mat.id ? (
                                                <>
                                                    <i className="fas fa-spinner fa-spin"></i> Downloading Document...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-arrow-alt-circle-down"></i> Download {mat.type.toUpperCase()} ({mat.size})
                                                </>
                                            )}
                                        </button>

                                        <div className="material-footer">
                                            <span>Uploaded: {mat.date}</span>
                                            <span className="portal-badge success" style={{ fontSize: "9px" }}>FREE</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="portal-card">
                            <div className="no-record-box">
                                <i className="fas fa-folder-open"></i>
                                <h4>No Materials Found</h4>
                                <p>There are no notes uploaded for the selected subject at this time.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Materials;
