import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { getProfile, logoutUser } from "../Services/authService";
import "../Styles/dashboard.css";
import "../Styles/pages.css";

const CertificateRequest = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form Inputs
    const [certType, setCertType] = useState("Bonafide Certificate");
    const [reason, setReason] = useState("");

    const fallbackUser = {
        name: "Student (Demo Mode)",
        role: "student",
        profileImg: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
    };

    // State list of requests (interactively mutable)
    const [requestsList, setRequestsList] = useState([
        { id: 1, date: "10-May-2026", type: "Fee Structure Certificate", purpose: "Education Bank Loan", status: "Approved", action: "Download" },
        { id: 2, date: "18-Apr-2026", type: "Course Completion Certificate", purpose: "Job Interview Proof", status: "Processing", action: "N/A" },
        { id: 3, date: "15-Dec-2025", type: "Bonafide Student Certificate", purpose: "Bus Pass Application", status: "Approved", action: "Download" }
    ]);

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

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (!reason.trim()) {
            alert("Please state the purpose of the request.");
            return;
        }

        setIsSubmitting(true);

        setTimeout(() => {
            setIsSubmitting(false);

            // Append new request to list
            const today = new Date();
            const formattedDate = `${String(today.getDate()).padStart(2, "0")}-${today.toLocaleString("default", { month: "short" })}-${today.getFullYear()}`;
            
            const newRequest = {
                id: Date.now(),
                date: formattedDate,
                type: certType,
                purpose: reason,
                status: "Processing",
                action: "N/A"
            };

            setRequestsList([newRequest, ...requestsList]);
            setReason("");
            alert("Certificate request successfully submitted to the student administration office.");
        }, 1200);
    };

    const handleDownload = (type) => {
        alert(`Downloading your official signed copy of "${type}" (Demo PDF).`);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "Approved": return <span className="portal-badge success">Approved</span>;
            case "Processing": return <span className="portal-badge warning">In Process</span>;
            case "Rejected": return <span className="portal-badge danger">Rejected</span>;
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
                        <h2><i className="fas fa-certificate"></i> Official Certificate Request</h2>
                    </div>

                    <div className="certificate-dashboard">
                        
                        {/* Left Side: Request Form */}
                        <div className="portal-card">
                            <h3 style={{ margin: "0 0 15px 0", fontSize: "16px", textTransform: "uppercase", color: "#4a5568", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>New Request</h3>
                            
                            <form onSubmit={handleFormSubmit} className="portal-form">
                                <div className="portal-form-group">
                                    <label>Certificate Type:</label>
                                    <select 
                                        className="portal-form-input"
                                        value={certType}
                                        onChange={(e) => setCertType(e.target.value)}
                                    >
                                        <option value="Bonafide Certificate">Bonafide Student Certificate</option>
                                        <option value="Course Completion Certificate">Course Completion Certificate</option>
                                        <option value="Fee Structure Certificate">Fee Structure Certificate</option>
                                        <option value="Grade Marksheet Transcript">Grade Marksheet Transcript</option>
                                    </select>
                                </div>

                                <div className="portal-form-group">
                                    <label>State Purpose / Reason:</label>
                                    <textarea 
                                        className="portal-form-textarea"
                                        placeholder="Briefly explain the purpose of this certificate (e.g., Bus pass application, visa file, educational bank loan, job interview proof...)"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        required
                                    ></textarea>
                                </div>

                                <button 
                                    type="submit" 
                                    className="portal-btn danger"
                                    disabled={isSubmitting}
                                    style={{ height: "42px" }}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin"></i> Submitting Request...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-paper-plane"></i> Submit Request
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Right Side: Requests History Log */}
                        <div className="portal-card blue-theme">
                            <h3 style={{ margin: "0 0 15px 0", fontSize: "16px", textTransform: "uppercase", color: "#4a5568", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>Requests Log</h3>
                            
                            {requestsList.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="portal-table">
                                        <thead>
                                            <tr>
                                                <th>Date Requested</th>
                                                <th>Certificate Type</th>
                                                <th>Purpose</th>
                                                <th>Approval Status</th>
                                                <th style={{ textAlign: "center" }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {requestsList.map(req => (
                                                <tr key={req.id}>
                                                    <td><strong>{req.date}</strong></td>
                                                    <td style={{ color: "#007bff", fontWeight: "500" }}>{req.type}</td>
                                                    <td>{req.purpose}</td>
                                                    <td>{getStatusBadge(req.status)}</td>
                                                    <td style={{ textAlign: "center" }}>
                                                        {req.status === "Approved" ? (
                                                            <button 
                                                                onClick={() => handleDownload(req.type)}
                                                                className="portal-btn success sm"
                                                                style={{ padding: "4px 10px" }}
                                                            >
                                                                <i className="fas fa-file-download"></i> Download
                                                            </button>
                                                        ) : (
                                                            <span style={{ fontSize: "12px", color: "#a0aec0" }}>Processing</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="no-record-box">
                                    <i className="fas fa-receipt"></i>
                                    <h4>No Requests Found</h4>
                                    <p>You have not submitted any certificate requests yet.</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default CertificateRequest;
