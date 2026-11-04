import { API_BASE_URL } from "../config/api";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { getAdminProfile, logoutUser, registerStudent } from "../Services/authService";
import "../Styles/dashboard.css";
import "../Styles/pages.css";

const emptyForm = { name: "", email: "", standardId: "", batchId: "", totalFee: "", password: "" };
const emptyEditForm = { name: "", email: "", mobile: "", parentName: "", address: "", standardId: "", batchId: "", isActive: true };

const StudentRegistration = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [studentsLoading, setStudentsLoading] = useState(true);
    const [standards, setStandards] = useState([]);
    const [batches, setBatches] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [studentToDelete, setStudentToDelete] = useState(null);
    const [editForm, setEditForm] = useState(emptyEditForm);
    const [formData, setFormData] = useState(emptyForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [profileError, setProfileError] = useState("");
    const [studentError, setStudentError] = useState("");
    const [optionsError, setOptionsError] = useState("");

    const loadStudents = useCallback(async () => {
        setStudentsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/students?limit=100&includeInactive=true`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(data?.message || `Student list request failed (HTTP ${response.status}).`);
            }
            if (!Array.isArray(data?.students)) {
                throw new Error("Student list response was not in the expected format.");
            }
            setStudents(data.students);
            setStudentError("");
        } finally {
            setStudentsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        let active = true;
        const initialize = async () => {
            if (!token || localStorage.getItem("role") !== "admin") {
                navigate("/login", { replace: true });
                return;
            }

            try {
                const profile = await getAdminProfile(token);
                if (!active) return;
                if (profile.role !== "admin") {
                    navigate("/", { replace: true });
                    return;
                }
                setUser(profile);
            } catch (error) {
                if (active) setProfileError(error.message || "Admin profile request failed.");
            }

            try {
                await loadStudents();
            } catch (error) {
                if (active) setStudentError(error.message || "Student list request failed.");
            }

            try {
                const headers = { Authorization: `Bearer ${token}` };
                const [standardsResponse, batchesResponse] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/admin/standards`, { headers }),
                    fetch(`${API_BASE_URL}/api/admin/batches`, { headers })
                ]);
                if (!standardsResponse.ok) throw new Error(`Standards request failed (HTTP ${standardsResponse.status}).`);
                if (!batchesResponse.ok) throw new Error(`Batches request failed (HTTP ${batchesResponse.status}).`);
                const [standardData, batchData] = await Promise.all([standardsResponse.json(), batchesResponse.json()]);
                if (active) {
                    setStandards(Array.isArray(standardData) ? standardData : []);
                    setBatches(Array.isArray(batchData) ? batchData : []);
                }
            } catch (error) {
                if (active) setOptionsError(error.message || "Class and batch options request failed.");
            } finally {
                if (active) setLoading(false);
            }
        };
        initialize();
        return () => { active = false; };
    }, [loadStudents, navigate, token]);

    const availableBatches = useMemo(
        () => batches.filter((batch) => batch.standard_id === Number(formData.standardId)),
        [batches, formData.standardId]
    );

    const closeModal = () => {
        setShowModal(false);
        setEditingStudent(null);
        setFormData(emptyForm);
        setEditForm(emptyEditForm);
        setErrorMessage("");
    };

    const openEditModal = (student) => {
        setEditingStudent(student);
        setEditForm({
            name: student.name || "", email: student.email || "", mobile: student.mobile || "",
            parentName: student.parent_name || "", address: student.address || "",
            standardId: student.standard_id ? String(student.standard_id) : "",
            batchId: student.batch_id ? String(student.batch_id) : "", isActive: Boolean(student.is_active)
        });
        setErrorMessage("");
        setShowModal(true);
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
        try {
            if (editingStudent) {
                const response = await fetch(`${API_BASE_URL}/api/admin/students/${editingStudent.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        ...editForm,
                        name: editForm.name.trim(), email: editForm.email.trim(), mobile: editForm.mobile.trim(),
                        parentName: editForm.parentName.trim(), address: editForm.address.trim(),
                        standardId: Number(editForm.standardId) || null, batchId: Number(editForm.batchId) || null
                    })
                });
                const data = await response.json().catch(() => null);
                if (!response.ok) throw new Error(data?.message || `Student update failed (HTTP ${response.status}).`);
                setSuccessMessage(data?.message || "Student details updated.");
                closeModal();
                try { await loadStudents(); } catch (refreshError) { setStudentError(refreshError.message || "Student updated, but the list could not be refreshed."); }
                return;
            }
            const standard = standards.find((item) => item.id === Number(formData.standardId));
            const batch = batches.find((item) => item.id === Number(formData.batchId));
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
            try {
                await loadStudents();
            } catch (refreshError) {
                setStudentError(refreshError.message || "Student was registered, but the list could not be refreshed.");
            }
        } catch (error) {
            setErrorMessage(error.message || "Registration failed. Please check the details.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteStudent = async () => {
        if (user?.role !== "admin" || !studentToDelete) return;
        setIsSubmitting(true);
        setErrorMessage("");
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/students/${studentToDelete.id}`, {
                method: "DELETE", headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) throw new Error(data?.message || `Student deactivation failed (HTTP ${response.status}).`);
            setStudentToDelete(null);
            setSuccessMessage(data?.message || "Student account deactivated; linked history was retained.");
            try { await loadStudents(); } catch (refreshError) { setStudentError(refreshError.message || "Student deactivated, but the list could not be refreshed."); }
        } catch (error) {
            setErrorMessage(error.message || "Could not deactivate student account.");
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
                        </div>
                        <button className="portal-btn primary" onClick={() => { setEditingStudent(null); setFormData(emptyForm); setErrorMessage(""); setShowModal(true); }}>
                            <i className="fas fa-plus" style={{ marginRight: "8px" }}></i> Add New Student
                        </button>
                    </div>

                    {profileError && <div className="portal-badge danger" style={{ display: "block", padding: "12px", marginBottom: "12px" }}>Admin profile request failed: {profileError}</div>}
                    {studentError && <div className="portal-badge danger" style={{ display: "block", padding: "12px", marginBottom: "12px" }}>Student list request failed: {studentError}</div>}
                    {optionsError && <div className="portal-badge danger" style={{ display: "block", padding: "12px", marginBottom: "12px" }}>Class/batch options request failed: {optionsError}</div>}
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
                                    {studentsLoading ? <tr><td colSpan="7" style={{ textAlign: "center", padding: "28px" }}>Loading students...</td></tr> : studentError ? <tr><td colSpan="7" style={{ textAlign: "center", padding: "28px" }}>Student records could not be loaded.</td></tr> : students.length ? students.map((student) => (
                                        <tr key={student.id}>
                                            <td><strong>{student.name}</strong></td>
                                            <td>{student.email}</td>
                                            <td>{student.standard_name || "-"}</td>
                                            <td>{student.batch_name || "-"}</td>
                                            <td>₹{Number(student.total_fee || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td><span className={`portal-badge ${student.is_active ? "success" : "warning"}`}>{student.is_active ? "Active" : "Inactive"}</span></td>
                                            <td><div style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
                                                <button className="portal-btn outline-primary" style={{ padding: "5px 10px", fontSize: "12px" }} onClick={() => openEditModal(student)}><i className="fas fa-edit"></i> Edit</button>
                                                {user?.role === "admin" && <button className="portal-btn outline-danger" style={{ padding: "5px 10px", fontSize: "12px" }} onClick={() => setStudentToDelete(student)}><i className="fas fa-user-slash"></i> Delete</button>}
                                            </div></td>
                                        </tr>
                                    )) : <tr><td colSpan="7" style={{ textAlign: "center", padding: "28px" }}>No registered students found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <p style={{ marginBottom: 0, color: "#718096", fontSize: "13px" }}>Enrollment changes and account deactivation are restricted to Admin. Linked fee and payment history is retained.</p>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
                    <div className="modal-content" style={{ backgroundColor: "#fff", padding: "28px", borderRadius: "12px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                            <div>
                                <h3 style={{ margin: 0, color: "#2d3748" }}><i className="fas fa-user-graduate" style={{ marginRight: "8px", color: "var(--primary-color)" }}></i>{editingStudent ? "Edit Student Details" : "Add New Student"}</h3>
                                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#718096" }}>{editingStudent ? "Update student profile and enrollment details." : "Create student login credentials and enrollment."}</p>
                            </div>
                            <button type="button" aria-label="Close" onClick={closeModal} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#a0aec0", lineHeight: 1 }}>×</button>
                        </div>
                        {errorMessage && <div style={{ padding: "12px", borderRadius: "8px", marginBottom: "18px", fontSize: "13px", textAlign: "center", backgroundColor: "#fed7d7", color: "#c53030" }}>{errorMessage}</div>}
                        <form onSubmit={handleSubmit}>
                            {editingStudent ? <>
                                <div className="portal-form-group"><label>Full Name <span style={{ color: "#e53e3e" }}>*</span></label><input className="form-input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required maxLength="100" /></div>
                                <div className="portal-form-group"><label>Email Address <span style={{ color: "#e53e3e" }}>*</span></label><input type="email" className="form-input" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required /></div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                    <div className="portal-form-group"><label>Mobile</label><input className="form-input" value={editForm.mobile} onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })} /></div>
                                    <div className="portal-form-group"><label>Parent / Guardian</label><input className="form-input" value={editForm.parentName} onChange={(e) => setEditForm({ ...editForm, parentName: e.target.value })} /></div>
                                </div>
                                <div className="portal-form-group"><label>Address</label><textarea className="form-input" rows="2" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                    <div className="portal-form-group"><label>Standard</label><select className="form-input" value={editForm.standardId} onChange={(e) => setEditForm({ ...editForm, standardId: e.target.value, batchId: "" })}><option value="">Select Standard</option>{standards.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                                    <div className="portal-form-group"><label>Batch</label><select className="form-input" value={editForm.batchId} onChange={(e) => setEditForm({ ...editForm, batchId: e.target.value })} disabled={!editForm.standardId}><option value="">Select Batch</option>{batches.filter((item) => item.standard_id === Number(editForm.standardId)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                                </div>
                                <div className="portal-form-group"><label>Status</label><select className="form-input" value={editForm.isActive ? "active" : "inactive"} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === "active" })}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                            </> : <>
                            <div className="portal-form-group"><label>Full Name <span style={{ color: "#e53e3e" }}>*</span></label><input className="form-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required maxLength="100" /></div>
                            <div className="portal-form-group"><label>Email Address <span style={{ color: "#e53e3e" }}>*</span></label><input type="email" className="form-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required /></div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div className="portal-form-group"><label>Standard <span style={{ color: "#e53e3e" }}>*</span></label><select className="form-input" value={formData.standardId} onChange={(e) => setFormData({ ...formData, standardId: e.target.value, batchId: "" })} required><option value="">Select Standard</option>{standards.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                                <div className="portal-form-group"><label>Batch <span style={{ color: "#e53e3e" }}>*</span></label><select className="form-input" value={formData.batchId} onChange={(e) => setFormData({ ...formData, batchId: e.target.value })} required disabled={!formData.standardId}><option value="">Select Batch</option>{availableBatches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                            </div>
                            <div className="portal-form-group"><label>Total Fee to be Collected (₹) <span style={{ color: "#e53e3e" }}>*</span></label><input type="number" className="form-input" value={formData.totalFee} onChange={(e) => setFormData({ ...formData, totalFee: e.target.value })} min="0.01" step="0.01" required /></div>
                            <div className="portal-form-group"><label>Temporary Password <span style={{ color: "#e53e3e" }}>*</span></label><input type="password" className="form-input" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} autoComplete="new-password" required /><small style={{ color: "#718096", fontSize: "12px" }}>Use at least 8 characters with uppercase, lowercase, a number, and a special character.</small></div>
                            </>}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px" }}>
                                <button type="button" className="portal-btn outline-secondary" onClick={closeModal}>Cancel</button>
                                <button type="submit" className="portal-btn primary" disabled={isSubmitting}>{isSubmitting ? (editingStudent ? "Saving..." : "Registering...") : (editingStudent ? "Save Changes" : "Register Student")}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {user?.role === "admin" && studentToDelete && (
                <div className="modal-overlay" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1001, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
                    <div className="modal-content" style={{ backgroundColor: "#fff", padding: "28px", borderRadius: "12px", width: "100%", maxWidth: "430px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)" }}>
                        <h3 style={{ marginTop: 0, color: "#2d3748" }}>Deactivate Student Account?</h3>
                        <p>Deactivate <strong>{studentToDelete.name}</strong>? Sign-in will be disabled. Profile, fee/payment history, and linked records will be retained.</p>
                        {errorMessage && <div style={{ padding: "12px", borderRadius: "8px", marginBottom: "18px", fontSize: "13px", backgroundColor: "#fed7d7", color: "#c53030" }}>{errorMessage}</div>}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px" }}>
                            <button className="portal-btn outline-secondary" onClick={() => { setStudentToDelete(null); setErrorMessage(""); }}>Cancel</button>
                            <button className="portal-btn outline-danger" onClick={deleteStudent} disabled={isSubmitting}>{isSubmitting ? "Deactivating..." : "Confirm Deactivation"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentRegistration;
