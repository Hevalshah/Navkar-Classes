import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { getProfile, logoutUser } from "../Services/authService";
import "../Styles/dashboard.css";
import "../Styles/pages.css";

// --- STUDENT FEE HISTORY COMPONENT ---
const StudentFeeHistory = ({ user, handleLogout }) => {
    const [downloadingId, setDownloadingId] = useState(null);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const token = localStorage.getItem("token");

    const fetchPaymentHistory = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/fees", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) setPaymentHistory(await res.json());
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchPaymentHistory();
    }, []);

    const handleDownloadReceipt = (id, receiptNo) => {
        setDownloadingId(id);
        setTimeout(() => {
            setDownloadingId(null);
            alert(`Receipt ${receiptNo} downloaded successfully! (Simulated PDF download)`);
        }, 1200);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "Paid": return <span className="portal-badge success">Paid</span>;
            case "Failed": return <span className="portal-badge danger">Failed</span>;
            case "Pending": return <span className="portal-badge warning">Pending</span>;
            default: return <span className="portal-badge info">{status}</span>;
        }
    };

    const totalPaid = paymentHistory
        .filter(r => r.status === "Paid")
        .reduce((sum, r) => sum + parseFloat(r.amount), 0);

    return (
        <div className="dashboard-layout">
            <Navbar role="student" user={user} onLogout={handleLogout} />
            <div className="dashboard-main-container">
                <div className="page-container">
                    <div className="page-header">
                        <h2><i className="fas fa-history"></i> Fee Payment History</h2>
                    </div>

                    <div className="summary-grid">
                        <div className="summary-card success">
                            <div className="summary-card-icon"><i className="fas fa-coins"></i></div>
                            <div className="summary-card-details">
                                <h4>Total Fees Paid</h4>
                                <p>₹{totalPaid.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="summary-card info">
                            <div className="summary-card-icon"><i className="fas fa-file-invoice"></i></div>
                            <div className="summary-card-details">
                                <h4>Total Receipts</h4>
                                <p>{paymentHistory.filter(r => r.status === "Paid").length} Receipts</p>
                            </div>
                        </div>
                        <div className="summary-card danger">
                            <div className="summary-card-icon"><i className="fas fa-times-circle"></i></div>
                            <div className="summary-card-details">
                                <h4>Failed Payments</h4>
                                <p>{paymentHistory.filter(r => r.status === "Failed").length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="portal-card">
                        {paymentHistory.length > 0 ? (
                            <div className="table-responsive">
                                <table className="portal-table">
                                    <thead>
                                        <tr>
                                            <th>Receipt No</th>
                                            <th>Payment Date</th>
                                            <th>Amount</th>
                                            <th>Payment Channel</th>
                                            <th>Status</th>
                                            <th style={{ textAlign: "center" }}>Receipt PDF</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paymentHistory.map(pay => (
                                            <tr key={pay.id}>
                                                <td><strong>REC-NC-{pay.id}</strong></td>
                                                <td>{new Date(pay.paid_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                <td style={{ fontWeight: "bold", color: pay.status === "Failed" ? "#e74c3c" : "#2d3748" }}>
                                                    ₹{parseFloat(pay.amount).toLocaleString()}
                                                </td>
                                                <td><span style={{ fontSize: "13px", color: "#718096" }}>{pay.payment_mode}</span></td>
                                                <td>{getStatusBadge(pay.status)}</td>
                                                <td style={{ textAlign: "center" }}>
                                                    {pay.status === "Paid" ? (
                                                        <button 
                                                            onClick={() => handleDownloadReceipt(pay.id, `REC-NC-${pay.id}`)}
                                                            className="portal-btn secondary sm"
                                                            disabled={downloadingId === pay.id}
                                                        >
                                                            {downloadingId === pay.id ? (
                                                                <><i className="fas fa-spinner fa-spin"></i> Downloading...</>
                                                            ) : (
                                                                <><i className="fas fa-file-download" style={{ marginRight: "4px" }}></i> PDF</>
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
                        ) : (
                            <div className="no-record-box">
                                <i className="fas fa-clipboard-list"></i>
                                <h4>No Payment Records Found</h4>
                                <p>You have not made any online payments yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- STAFF FEE MANAGEMENT COMPONENT ---
const StaffFeeManagement = ({ user, handleLogout }) => {
    const [selectedBatch, setSelectedBatch] = useState("All");
    const [selectedStatus, setSelectedStatus] = useState("All");
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);

    const [students, setStudents] = useState([]);
    const [payments, setPayments] = useState([]);
    const [batches, setBatches] = useState([]);

    const [formData, setFormData] = useState({
        studentId: "",
        amount: "",
        method: "UPI",
        refNo: ""
    });

    const token = localStorage.getItem("token");

    const loadData = async () => {
        try {
            // Load batches
            const resB = await fetch("http://localhost:5000/api/admin/batches");
            if (resB.ok) setBatches(await resB.json());

            // Load students
            const resS = await fetch("http://localhost:5000/api/admin/students", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (resS.ok) setStudents(await resS.json());

            // Load all fees records
            const resF = await fetch("http://localhost:5000/api/fees", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (resF.ok) setPayments(await resF.json());

        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleRecordPayment = (studentId) => {
        setFormData({
            studentId: studentId.toString(),
            amount: "",
            method: "UPI",
            refNo: ""
        });
        setShowModal(true);
    };

    const handleSavePayment = async (e) => {
        e.preventDefault();
        const amt = parseFloat(formData.amount);
        if(!amt || amt <= 0) return;

        try {
            const res = await fetch("http://localhost:5000/api/fees/pay", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    studentId: parseInt(formData.studentId),
                    amount: amt,
                    paymentMode: formData.method,
                    referenceNo: formData.refNo
                })
            });

            if (res.ok) {
                loadData();
                setShowModal(false);
            } else {
                alert("Failed to record payment.");
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Process students and compile fee info
    const studentsWithFeeInfo = students.map(student => {
        const studentPayments = payments.filter(p => p.student_id === student.id && p.status === "Paid");
        const paidAmount = studentPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        
        // Define total fee based on Standard
        const stdName = (student.standard_name || "").toLowerCase();
        const totalFees = stdName.includes("11") || stdName.includes("12") || stdName.includes("commerce") ? 50000 : 35000;
        
        const pendingAmount = Math.max(0, totalFees - paidAmount);
        
        let status = "Unpaid";
        if (paidAmount >= totalFees) status = "Paid";
        else if (paidAmount > 0) status = "Partial";

        const lastPaymentDate = studentPayments.length > 0 
            ? new Date(studentPayments[0].paid_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : "-";

        return {
            ...student,
            totalFees,
            paidAmount,
            pendingAmount,
            status,
            lastPaymentDate
        };
    });

    const filteredStudents = studentsWithFeeInfo.filter(s => {
        const matchBatch = selectedBatch === "All" || s.batch_id === parseInt(selectedBatch);
        const matchStatus = selectedStatus === "All" || s.status === selectedStatus;
        const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchBatch && matchStatus && matchSearch;
    });

    // Summary calculations
    const totalCollected = payments.filter(p => p.status === "Paid").reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    const totalPending = studentsWithFeeInfo.reduce((acc, curr) => acc + curr.pendingAmount, 0);
    const fullyPaidCount = studentsWithFeeInfo.filter(s => s.status === "Paid").length;

    const statuses = ["All", "Paid", "Partial", "Unpaid"];

    return (
        <div className="dashboard-layout">
            <Navbar role="staff" user={user} onLogout={handleLogout} />
            <div className="dashboard-main-container">
                <div className="page-container">
                    <div className="page-header">
                        <h2><i className="fas fa-file-invoice-dollar"></i> Fee Collection & Management</h2>
                    </div>

                    {/* Finance Dashboard Summary */}
                    <div className="summary-grid" style={{ marginBottom: '25px' }}>
                        <div className="summary-card success">
                            <div className="summary-card-icon"><i className="fas fa-wallet"></i></div>
                            <div className="summary-card-details">
                                <h4>Total Collected</h4>
                                <p>₹{totalCollected.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="summary-card danger">
                            <div className="summary-card-icon"><i className="fas fa-hand-holding-usd"></i></div>
                            <div className="summary-card-details">
                                <h4>Outstanding Fees</h4>
                                <p>₹{totalPending.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="summary-card info">
                            <div className="summary-card-icon"><i className="fas fa-user-graduate"></i></div>
                            <div className="summary-card-details">
                                <h4>Fully Paid Students</h4>
                                <p>{fullyPaidCount} Students</p>
                            </div>
                        </div>
                    </div>

                    <div className="portal-card">
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <input 
                                    type="text" 
                                    placeholder="Search by student name..." 
                                    className="form-input"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div>
                                <select className="select-filter form-input" value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
                                    <option value="All">All Batches</option>
                                    {batches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.standard_name})</option>)}
                                </select>
                            </div>
                            <div>
                                <select className="select-filter form-input" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                                    {statuses.map(s => <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table className="portal-table">
                                <thead>
                                    <tr>
                                        <th>Student Name</th>
                                        <th>Batch</th>
                                        <th>Total Fee</th>
                                        <th>Paid</th>
                                        <th>Pending</th>
                                        <th>Last Payment</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.length > 0 ? (
                                        filteredStudents.map(student => (
                                            <tr key={student.id}>
                                                <td><strong>{student.name}</strong></td>
                                                <td><span className="portal-badge" style={{backgroundColor: '#e2e8f0', color: '#4a5568'}}>{student.batch_name || "N/A"}</span></td>
                                                <td>₹{student.totalFees.toLocaleString()}</td>
                                                <td style={{ color: '#2ecc71', fontWeight: '600' }}>₹{student.paidAmount.toLocaleString()}</td>
                                                <td style={{ color: student.pendingAmount > 0 ? '#e74c3c' : '#718096', fontWeight: '600' }}>₹{student.pendingAmount.toLocaleString()}</td>
                                                <td>{student.lastPaymentDate}</td>
                                                <td>
                                                    <span className={`portal-badge ${student.status === "Paid" ? "success" : student.status === "Partial" ? "warning" : "danger"}`}>
                                                        {student.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    {student.pendingAmount > 0 ? (
                                                        <button className="portal-btn primary sm" onClick={() => handleRecordPayment(student.id)}>
                                                            <i className="fas fa-plus-circle"></i> Record Pay
                                                        </button>
                                                    ) : (
                                                        <span style={{ color: '#2ecc71', fontSize: '13px' }}><i className="fas fa-check-circle"></i> Cleared</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No student records matching filters.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Record Payment Modal */}
            {showModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="modal-content" style={{
                        backgroundColor: '#fff', padding: '24px', borderRadius: '8px',
                        width: '100%', maxWidth: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>Record Fee Payment</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>&times;</button>
                        </div>
                        
                        <form onSubmit={handleSavePayment}>
                            <div className="portal-form-group">
                                <label>Amount Received (₹)</label>
                                <input type="number" className="form-input" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required placeholder="e.g. 5000" />
                            </div>

                            <div className="portal-form-group">
                                <label>Payment Method</label>
                                <select className="form-input" value={formData.method} onChange={(e) => setFormData({...formData, method: e.target.value})} required>
                                    <option value="UPI">UPI (GooglePay / Paytm)</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Debit Card">Debit Card</option>
                                    <option value="Credit Card">Credit Card</option>
                                    <option value="Net Banking">Net Banking</option>
                                </select>
                            </div>

                            <div className="portal-form-group">
                                <label>Reference/Txn No (Optional)</label>
                                <input type="text" className="form-input" value={formData.refNo} onChange={(e) => setFormData({...formData, refNo: e.target.value})} placeholder="e.g. TXN987216" />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                                <button type="button" className="portal-btn outline-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="portal-btn primary">Record Transaction</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const fallbackUser = {
    name: "User (Demo Mode)",
    role: "student",
    profileImg: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
};

// --- MAIN COMPONENT ---
const FeeHistory = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [role, setRole] = useState("student");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem("token");
            const storedRole = localStorage.getItem("role") || "student";
            setRole(storedRole);
            
            if (!token) {
                setUser({ ...fallbackUser, role: storedRole });
                setLoading(false);
                return;
            }
            try {
                const userData = await getProfile(token);
                setUser(userData);
                if (userData.role) setRole(userData.role);
            } catch (error) {
                setUser({ ...fallbackUser, role: storedRole });
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleLogout = async () => {
        const token = localStorage.getItem("token");
        try {
            if (token) await logoutUser(token);
        } catch (error) {
            console.error("Logout failed", error);
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            navigate("/");
        }
    };

    if (loading) return null;

    if (role === "staff" || role === "admin") {
        return <StaffFeeManagement user={user} handleLogout={handleLogout} />;
    }

    return <StudentFeeHistory user={user} handleLogout={handleLogout} />;
};

export default FeeHistory;
