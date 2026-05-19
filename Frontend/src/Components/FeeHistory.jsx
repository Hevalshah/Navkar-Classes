import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { getProfile, logoutUser } from "../Services/authService";
import "../Styles/dashboard.css";
import "../Styles/pages.css";

const FeeHistory = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);

    const fallbackUser = {
        name: "Student (Demo Mode)",
        role: "student",
        profileImg: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
    };

    // Dummy payment history data
    const paymentHistory = [
        { id: 1, receiptNo: "REC-2026-098", date: "15-May-2026", desc: "Admission Registration Fee - CA Intermediate", amount: 5000, method: "UPI (GooglePay)", status: "Paid" },
        { id: 2, receiptNo: "REC-2026-041", date: "10-Jan-2026", desc: "CA Foundation - Mock Exam & Test Series", amount: 3000, method: "Debit Card (HDFC)", status: "Paid" },
        { id: 3, receiptNo: "REC-2025-882", date: "05-Sep-2025", desc: "CA Foundation - Group 1 Study Materials", amount: 4500, method: "Net Banking (SBI)", status: "Paid" },
        { id: 4, receiptNo: "REC-2025-110", date: "12-May-2025", desc: "CA Foundation - Academic Tuition Fee (Installment 1)", amount: 15000, method: "Credit Card (ICICI)", status: "Paid" },
        { id: 5, receiptNo: "REC-2025-008", date: "10-May-2025", desc: "Late Submission Fine charge", amount: 500, method: "UPI (Paytm)", status: "Failed" }
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

    const handleDownloadReceipt = (id, receiptNo) => {
        setDownloadingId(id);
        
        // Simulate PDF generation & download
        setTimeout(() => {
            setDownloadingId(null);
            alert(`Receipt ${receiptNo} downloaded successfully! (Demo simulated PDF file)`);
        }, 1500);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "Paid": return <span className="portal-badge success">Paid</span>;
            case "Failed": return <span className="portal-badge danger">Failed</span>;
            case "Pending": return <span className="portal-badge warning">Pending</span>;
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
                        <h2><i className="fas fa-history"></i> Fee Payment History</h2>
                    </div>

                    {/* Fee Summary Cards */}
                    <div className="summary-grid">
                        <div className="summary-card success">
                            <div className="summary-card-icon">
                                <i className="fas fa-coins"></i>
                            </div>
                            <div className="summary-card-details">
                                <h4>Total Fees Paid</h4>
                                <p>₹27,500</p>
                            </div>
                        </div>

                        <div className="summary-card info">
                            <div className="summary-card-icon">
                                <i className="fas fa-file-invoice"></i>
                            </div>
                            <div className="summary-card-details">
                                <h4>Total Receipts</h4>
                                <p>{paymentHistory.filter(r => r.status === "Paid").length} Receipts</p>
                            </div>
                        </div>

                        <div className="summary-card danger">
                            <div className="summary-card-icon">
                                <i className="fas fa-times-circle"></i>
                            </div>
                            <div className="summary-card-details">
                                <h4>Failed Payments</h4>
                                <p>{paymentHistory.filter(r => r.status === "Failed").length}</p>
                            </div>
                        </div>
                    </div>

                    {/* Payments Table */}
                    <div className="portal-card">
                        <div className="table-responsive">
                            <table className="portal-table">
                                <thead>
                                    <tr>
                                        <th>Receipt No</th>
                                        <th>Payment Date</th>
                                        <th>Fee Head Description</th>
                                        <th>Paid Amount</th>
                                        <th>Payment Channel</th>
                                        <th>Transaction Status</th>
                                        <th style={{ textAlign: "center" }}>Receipt PDF</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paymentHistory.map(pay => (
                                        <tr key={pay.id}>
                                            <td><strong>{pay.receiptNo}</strong></td>
                                            <td>{pay.date}</td>
                                            <td style={{ color: "#4a5568", fontWeight: "500" }}>{pay.desc}</td>
                                            <td style={{ fontWeight: "bold", color: pay.status === "Failed" ? "#e74c3c" : "#2d3748" }}>
                                                ₹{pay.amount.toLocaleString()}
                                            </td>
                                            <td><span style={{ fontSize: "13px", color: "#718096" }}>{pay.method}</span></td>
                                            <td>{getStatusBadge(pay.status)}</td>
                                            <td style={{ textAlign: "center" }}>
                                                {pay.status === "Paid" ? (
                                                    <button 
                                                        onClick={() => handleDownloadReceipt(pay.id, pay.receiptNo)}
                                                        className="portal-btn secondary sm"
                                                        disabled={downloadingId === pay.id}
                                                    >
                                                        {downloadingId === pay.id ? (
                                                            <>
                                                                <i className="fas fa-spinner fa-spin"></i> Downloading...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="fas fa-file-download" style={{ marginRight: "4px" }}></i> PDF
                                                            </>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <span style={{ color: "#a0aec0", fontSize: "12px" }}>N/A</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeeHistory;
