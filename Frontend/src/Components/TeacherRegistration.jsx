import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { getProfile, logoutUser } from "../Services/authService";
import "../Styles/dashboard.css";
import "../Styles/pages.css";

const fallbackUser = {
    name: "User (Demo Mode)",
    role: "staff",
    profileImg: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
};

const TeacherRegistration = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [role, setRole] = useState("staff");
    const [loading, setLoading] = useState(true);

    // Teacher list
    const [teachers, setTeachers] = useState([]);
    const [loadingTeachers, setLoadingTeachers] = useState(false);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState(null); // null = Add, object = Edit

    // Form fields
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        mobile: "",
        password: "",
        status: "Active"
    });

    // Messages
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete confirm
    const [teacherToDelete, setTeacherToDelete] = useState(null);

    const token = localStorage.getItem("token");

    useEffect(() => {
        const fetchProfile = async () => {
            const storedRole = localStorage.getItem("role") || "student";
            setRole(storedRole);

            if (storedRole !== "staff" && storedRole !== "admin") {
                navigate("/dashboard");
                return;
            }

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
        loadTeachers();
    }, [navigate]);

    const loadTeachers = async () => {
        setLoadingTeachers(true);
        try {
            const res = await fetch("http://localhost:5000/api/admin/teachers", {
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            });
            if (res.ok) {
                setTeachers(await res.json());
            }
        } catch (err) {
            console.error("Failed to load teachers", err);
        } finally {
            setLoadingTeachers(false);
        }
    };

    const handleLogout = async () => {
        try {
            if (token) await logoutUser(token);
        } catch (error) {
            console.error("Logout failed", error);
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            navigate("/login");
        }
    };

    const openAddModal = () => {
        setEditingTeacher(null);
        setFormData({ name: "", email: "", mobile: "", password: "", status: "Active" });
        setSuccessMessage("");
        setErrorMessage("");
        setShowModal(true);
    };

    const openEditModal = (teacher) => {
        setEditingTeacher(teacher);
        setFormData({
            name: teacher.name || teacher.fullName || "",
            email: teacher.email || "",
            mobile: teacher.mobile || "",
            password: "", // Leave blank unless changing
            status: teacher.status || "Active"
        });
        setSuccessMessage("");
        setErrorMessage("");
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingTeacher(null);
        setFormData({ name: "", email: "", mobile: "", password: "", status: "Active" });
        setSuccessMessage("");
        setErrorMessage("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccessMessage("");
        setErrorMessage("");
        setIsSubmitting(true);

        try {
            const payload = {
                name: formData.name.trim(),
                email: formData.email.trim(),
                mobile: formData.mobile.trim(),
                status: formData.status
            };

            if (formData.password) {
                payload.password = formData.password;
            }

            let res;
            if (editingTeacher) {
                // Update existing teacher
                res = await fetch(`http://localhost:5000/api/admin/teachers/${editingTeacher.id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
            } else {
                // Create new teacher — password required
                if (!formData.password) {
                    setErrorMessage("Password is required when adding a new teacher.");
                    setIsSubmitting(false);
                    return;
                }
                res = await fetch("http://localhost:5000/api/admin/teachers", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
            }

            if (res.ok) {
                setSuccessMessage(
                    editingTeacher
                        ? "Teacher details updated successfully."
                        : "Teacher registered successfully! They can now log in using their credentials."
                );
                loadTeachers();
                setTimeout(() => closeModal(), 1800);
            } else {
                const data = await res.json();
                setErrorMessage(data.message || "Operation failed. Please try again.");
            }
        } catch (err) {
            setErrorMessage("Network error. Please check your connection.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        if (!teacherToDelete) return;
        try {
            const res = await fetch(`http://localhost:5000/api/admin/teachers/${teacherToDelete.id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                setTeachers(prev => prev.filter(t => t.id !== teacherToDelete.id));
            } else {
                alert("Failed to delete teacher.");
            }
        } catch (err) {
            alert("Network error during deletion.");
        } finally {
            setTeacherToDelete(null);
        }
    };

    if (loading) return null;

    return (
        <div className="dashboard-layout">
            <Navbar role={role} user={user} onLogout={handleLogout} />

            <div className="dashboard-main-container">
                <div className="page-container">

                    {/* Header */}
                    <div className="page-header">
                        <h2><i className="fas fa-chalkboard-teacher"></i> Teacher Registration</h2>
                        <div className="header-actions">
                            <button className="portal-btn primary" onClick={openAddModal}>
                                <i className="fas fa-user-plus"></i> Add New Teacher
                            </button>
                        </div>
                    </div>

                    {/* Teacher List Table */}
                    <div className="portal-card">
                        {loadingTeachers ? (
                            <div className="no-record-box">
                                <i className="fas fa-spinner fa-spin"></i>
                                <h4>Loading teachers...</h4>
                            </div>
                        ) : teachers.length > 0 ? (
                            <div className="table-responsive">
                                <table className="portal-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Full Name</th>
                                            <th>Email</th>
                                            <th>Mobile</th>
                                            <th>Status</th>
                                            <th style={{ textAlign: "center" }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teachers.map((teacher, index) => (
                                            <tr key={teacher.id}>
                                                <td style={{ color: "#718096", fontSize: "13px" }}>{index + 1}</td>
                                                <td>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                        <div style={{
                                                            width: "36px", height: "36px", borderRadius: "50%",
                                                            background: "linear-gradient(135deg, var(--primary-color), var(--primary-dark))",
                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                            color: "#fff", fontWeight: "700", fontSize: "14px", flexShrink: 0
                                                        }}>
                                                            {(teacher.name || teacher.fullName || "T")[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <strong>{teacher.name || teacher.fullName}</strong>
                                                            <div style={{ fontSize: "11px", color: "#a0aec0" }}>
                                                                TCH-{String(teacher.id).slice(-6).toUpperCase()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: "13px", color: "#4a5568" }}>{teacher.email}</td>
                                                <td style={{ fontSize: "13px", color: "#718096" }}>{teacher.mobile || "—"}</td>
                                                <td>
                                                    <span className={`portal-badge ${teacher.status === "Active" ? "success" : "warning"}`}>
                                                        {teacher.status || "Active"}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: "center" }}>
                                                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                                                        <button
                                                            className="portal-btn outline-primary"
                                                            style={{ padding: "5px 10px", fontSize: "12px" }}
                                                            onClick={() => openEditModal(teacher)}
                                                        >
                                                            <i className="fas fa-edit"></i> Edit
                                                        </button>
                                                        <button
                                                            className="portal-btn outline-danger"
                                                            style={{ padding: "5px 10px", fontSize: "12px" }}
                                                            onClick={() => setTeacherToDelete(teacher)}
                                                        >
                                                            <i className="fas fa-trash"></i> Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="no-record-box">
                                <i className="fas fa-chalkboard-teacher"></i>
                                <h4>No Teachers Registered</h4>
                                <p>Click "Add New Teacher" to register the first faculty member.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add / Edit Teacher Modal */}
            {showModal && (
                <div className="modal-overlay" style={{
                    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                    backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex",
                    alignItems: "center", justifyContent: "center"
                }}>
                    <div className="modal-content" style={{
                        backgroundColor: "#fff", padding: "28px", borderRadius: "12px",
                        width: "100%", maxWidth: "520px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)"
                    }}>
                        {/* Modal Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                            <div>
                                <h3 style={{ margin: 0, color: "#2d3748" }}>
                                    <i className="fas fa-chalkboard-teacher" style={{ marginRight: "8px", color: "var(--primary-color)" }}></i>
                                    {editingTeacher ? "Edit Teacher Details" : "Add New Teacher"}
                                </h3>
                                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#718096" }}>
                                    {editingTeacher
                                        ? "Update faculty credentials and information."
                                        : "Register a new faculty member into the system."}
                                </p>
                            </div>
                            <button onClick={closeModal} style={{
                                background: "none", border: "none", fontSize: "22px",
                                cursor: "pointer", color: "#a0aec0", lineHeight: 1
                            }}>&times;</button>
                        </div>

                        {/* Messages */}
                        {successMessage && (
                            <div className="portal-badge success" style={{
                                display: "block", padding: "12px", borderRadius: "8px",
                                marginBottom: "18px", fontSize: "13px", textAlign: "center"
                            }}>
                                <i className="fas fa-check-circle" style={{ marginRight: "6px" }}></i>
                                {successMessage}
                            </div>
                        )}
                        {errorMessage && (
                            <div style={{
                                padding: "12px", borderRadius: "8px", marginBottom: "18px",
                                fontSize: "13px", textAlign: "center",
                                backgroundColor: "#fed7d7", color: "#c53030"
                            }}>
                                <i className="fas fa-exclamation-triangle" style={{ marginRight: "6px" }}></i>
                                {errorMessage}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {/* Full Name */}
                            <div className="portal-form-group">
                                <label>
                                    <i className="fas fa-user" style={{ marginRight: "6px", color: "var(--primary-color)" }}></i>
                                    Full Name <span style={{ color: "#e53e3e" }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Prof. R. C. Shah"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Email */}
                            <div className="portal-form-group">
                                <label>
                                    <i className="fas fa-envelope" style={{ marginRight: "6px", color: "var(--primary-color)" }}></i>
                                    Email Address <span style={{ color: "#e53e3e" }}>*</span>
                                </label>
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="e.g. teacher@navkar.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Mobile */}
                            <div className="portal-form-group">
                                <label>
                                    <i className="fas fa-phone" style={{ marginRight: "6px", color: "var(--primary-color)" }}></i>
                                    Mobile Number <span style={{ color: "#e53e3e" }}>*</span>
                                </label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    placeholder="e.g. 9876543210"
                                    value={formData.mobile}
                                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                    required
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                {/* Password */}
                                <div className="portal-form-group">
                                    <label>
                                        <i className="fas fa-lock" style={{ marginRight: "6px", color: "var(--primary-color)" }}></i>
                                        Password {!editingTeacher && <span style={{ color: "#e53e3e" }}>*</span>}
                                    </label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder={editingTeacher ? "Leave blank to keep" : "Set a password"}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required={!editingTeacher}
                                    />
                                </div>

                                {/* Status */}
                                <div className="portal-form-group">
                                    <label>
                                        <i className="fas fa-toggle-on" style={{ marginRight: "6px", color: "var(--primary-color)" }}></i>
                                        Status
                                    </label>
                                    <select
                                        className="form-input"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            {!editingTeacher && (
                                <div style={{
                                    background: "#ebf8ff", border: "1px solid #bee3f8", borderRadius: "8px",
                                    padding: "11px 14px", fontSize: "12px", color: "#2b6cb0", marginBottom: "8px"
                                }}>
                                    <i className="fas fa-info-circle" style={{ marginRight: "6px" }}></i>
                                    <strong>Note:</strong> The teacher will use their email and this password to log in. They can change the password via their profile.
                                </div>
                            )}

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px" }}>
                                <button type="button" className="portal-btn outline-secondary" onClick={closeModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="portal-btn primary" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <><i className="fas fa-spinner fa-spin" style={{ marginRight: "6px" }}></i>
                                            {editingTeacher ? "Saving..." : "Registering..."}</>
                                    ) : (
                                        <><i className="fas fa-save" style={{ marginRight: "6px" }}></i>
                                            {editingTeacher ? "Save Changes" : "Register Teacher"}</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {teacherToDelete && (
                <div className="modal-overlay" style={{
                    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                    backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1001, display: "flex",
                    alignItems: "center", justifyContent: "center"
                }}>
                    <div style={{
                        backgroundColor: "#fff", padding: "28px", borderRadius: "12px",
                        width: "100%", maxWidth: "400px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)",
                        textAlign: "center"
                    }}>
                        <div style={{
                            width: "60px", height: "60px", borderRadius: "50%",
                            backgroundColor: "#fff5f5", display: "flex", alignItems: "center",
                            justifyContent: "center", margin: "0 auto 16px auto"
                        }}>
                            <i className="fas fa-exclamation-triangle" style={{ fontSize: "28px", color: "#e53e3e" }}></i>
                        </div>
                        <h3 style={{ margin: "0 0 8px 0", color: "#2d3748" }}>Delete Teacher?</h3>
                        <p style={{ color: "#718096", fontSize: "14px", margin: "0 0 24px 0" }}>
                            Are you sure you want to remove <strong>{teacherToDelete.name || teacherToDelete.fullName}</strong>?
                            This action cannot be undone.
                        </p>
                        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                            <button className="portal-btn outline-secondary" onClick={() => setTeacherToDelete(null)}>
                                Cancel
                            </button>
                            <button className="portal-btn danger" onClick={confirmDelete}>
                                <i className="fas fa-trash" style={{ marginRight: "6px" }}></i>
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherRegistration;
