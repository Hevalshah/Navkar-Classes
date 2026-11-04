import { API_BASE_URL } from "../config/api";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { getProfile, logoutUser, registerStudent } from "../Services/authService";
import "../Styles/dashboard.css";
import "../Styles/pages.css";

const emptyForm = { name: "", email: "", standardId: "", batchId: "", totalFee: "", password: "" };

const StudentRegistration = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [standards, setStandards] = useState([]);
    const [batches, setBatches] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState(emptyForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const loadStudents = useCallback(async () => {
        const response = await fetch(`${API_BASE_URL}/api/admin/students?limit=100&includeInactive=true`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load students.");
        setStudents(data.students || []);
    }, [token]);

    useEffect(() => {
        let active = true;
        const initialize = async () => {
            try {
                if (!token || localStorage.getItem("role") !== "admin") {
                    navigate("/login", { replace: true });
                    return;
                }
                const profile = await getProfile(token);
                if (!active) return;
                if (profile.role !== "admin") {
                    navigate("/", { replace: true });
                    return;
                }
                setUser(profile);
                const headers = { Authorization: `Bearer ${token}` };
                const [studentsResponse, standardsResponse, batchesResponse] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/admin/students?limit=100&includeInactive=true`, { headers }),
                    fetch(`${API_BASE_URL}/api/admin/standards`, { headers }),
                    fetch(`${API_BASE_URL}/api/admin/batches`, { headers })
                ]);
                if (!studentsResponse.ok || !standardsResponse.ok || !batchesResponse.ok) {
                    throw new Error("Could not load student registration data.");
                }
                const [studentData, standardData, batchData] = await Promise.all([
                    studentsResponse.json(), standardsResponse.json(), batchesResponse.json()
                ]);
                if (active) {
                    setStudents(studentData.students || []);
                    setStandards(Array.isArray(standardData) ? standardData : []);
                    setBatches(Array.isArray(batchData) ? batchData : []);
                }
            } catch (error) {
                if (active) setErrorMessage(error.message || "Could not load registration data.");
            } finally {
                if (active) setLoading(false);
            }
        };
        initialize();
        return () => { active = false; };
    }, [navigate, token]);

    const availableBatches = useMemo(
        () => batches.filter((batch) => batch.standard_id === Number(formData.standardId)),
        [batches, formData.standardId]
    );

    const closeModal = () => {
        setShowModal(false);
        setFormData(emptyForm);
        setErrorMessage("");
    };

    const handleLogout = async () => {
        try { if (token) await logoutUser(token); } catch (error) { console.error("Logout failed", error); }
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        navigate("/login");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setSuccessMessage("");
        setErrorMessage("");
        const standard = standards.find((item) => item.id === Number(formData.standardId));
        const batch = batches.find((item) => item.id === Number(formData.batchId));
        try {
            const result = await registerStudent({
                name: formData.name.trim(),
                email: formData.email.trim(),
                course: standard?.name || "",
                standardId: Number(formData.standardId),
                batchId: Number(formData.batchId),
                assignedBatch: batch?.name || "",
                totalFee: Number(formData.totalFee),
                password: formData.password
            }, token);
            setSuccessMessage(result.message || "Student registered successfully.");
            closeModal();
            await loadStudents();
        } catch (error) {
            setErrorMessage(error.message || "Registration failed. Please check the details.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return null;

    return (
        <div className="dashboard-layout">
            <Navbar role="admin" user={user} onLogout={handleLogout} />
            <div className="dashboard-main-container">
                <div className="page-container">
                    <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                        <div>
                            <h2><i className="fas fa-user-plus"></i> Student Registration</h2>
                            <span className="subtitle">View registered students and add new students</span>
                        </div>
                        <button className="portal-btn primary" onClick={() => { setErrorMessage(""); setShowModal(true); }}>
                            <i className="fas fa-plus" style={{ marginRight: "8px" }}></i> Add New Student
                        </button>
                    </div>

                    {(successMessage || errorMessage) && (
                        <div className={`portal-badge ${errorMessage ? "danger" : "success"}`} style={{ display: "block", padding: "12px", marginBottom: "16px" }}>
                            {errorMessage || successMessage}
                        </div>
                    )}

                    <div className="portal-card">
                        <div className="table-responsive">
                            <table className="portal-table">
                                <thead><tr><th>Student</th><th>Email</th><th>Standard</th><th>Batch</th><th>Total Fee</th><th>Status</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {students.length ? students.map((student) => (
                                        <tr key={student.id}>
                                            <td><strong>{student.name}</strong></td>
                                            <td>{student.email}</td>
                                            <td>{student.standard_name || "-"}</td>
                                            <td>{student.batch_name || "-"}</td>
                                            <td>₹{Number(student.total_fee || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td><span className={`portal-badge ${student.is_active ? "success" : "warning"}`}>{student.is_active ? "Active" : "Inactive"}</span></td>
                                            <td><button className="portal-btn outline-primary" style={{ padding: "5px 10px", fontSize: "12px" }} onClick={() => navigate("/students")}>
                                                <i className="fas fa-edit"></i> Edit Details
                                            </button></td>
                                        </tr>
                                    )) : <tr><td colSpan="7" style={{ textAlign: "center", padding: "28px" }}>No registered students found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <p style={{ marginBottom: 0, color: "#718096", fontSize: "13px" }}>Edit Details opens student management. Enrollment changes and account removal are restricted to Admin.</p>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
                    <div className="modal-content" style={{ backgroundColor: "#fff", padding: "28px", borderRadius: "12px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                            <div>
                                <h3 style={{ margin: 0, color: "#2d3748" }}><i className="fas fa-user-graduate" style={{ marginRight: "8px", color: "var(--primary-color)" }}></i>Add New Student</h3>
                                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#718096" }}>Create student login credentials and enrollment.</p>
                            </div>
                            <button type="button" aria-label="Close" onClick={closeModal} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#a0aec0", lineHeight: 1 }}>×</button>
                        </div>
                        {errorMessage && <div style={{ padding: "12px", borderRadius: "8px", marginBottom: "18px", fontSize: "13px", textAlign: "center", backgroundColor: "#fed7d7", color: "#c53030" }}>{errorMessage}</div>}
                        <form onSubmit={handleSubmit}>
                            <div className="portal-form-group"><label>Full Name <span style={{ color: "#e53e3e" }}>*</span></label><input className="form-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required maxLength="100" /></div>
                            <div className="portal-form-group"><label>Email Address <span style={{ color: "#e53e3e" }}>*</span></label><input type="email" className="form-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required /></div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div className="portal-form-group"><label>Standard <span style={{ color: "#e53e3e" }}>*</span></label><select className="form-input" value={formData.standardId} onChange={(e) => setFormData({ ...formData, standardId: e.target.value, batchId: "" })} required><option value="">Select Standard</option>{standards.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                                <div className="portal-form-group"><label>Batch <span style={{ color: "#e53e3e" }}>*</span></label><select className="form-input" value={formData.batchId} onChange={(e) => setFormData({ ...formData, batchId: e.target.value })} required disabled={!formData.standardId}><option value="">Select Batch</option>{availableBatches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                            </div>
                            <div className="portal-form-group"><label>Total Fee to be Collected (₹) <span style={{ color: "#e53e3e" }}>*</span></label><input type="number" className="form-input" value={formData.totalFee} onChange={(e) => setFormData({ ...formData, totalFee: e.target.value })} min="0.01" step="0.01" required /></div>
                            <div className="portal-form-group"><label>Temporary Password <span style={{ color: "#e53e3e" }}>*</span></label><input type="password" className="form-input" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} autoComplete="new-password" required /><small style={{ color: "#718096", fontSize: "12px" }}>Use at least 8 characters with uppercase, lowercase, a number, and a special character.</small></div>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px" }}>
                                <button type="button" className="portal-btn outline-secondary" onClick={closeModal}>Cancel</button>
                                <button type="submit" className="portal-btn primary" disabled={isSubmitting}>{isSubmitting ? "Registering..." : "Register Student"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentRegistration;
