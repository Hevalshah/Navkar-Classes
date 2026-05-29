import React, { useCallback, useEffect, useMemo, useState } from "react";
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

const StudentManagement = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const [user, setUser] = useState(null);
    const [role, setRole] = useState("staff");
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [standards, setStandards] = useState([]);
    const [batches, setBatches] = useState([]);
    const [search, setSearch] = useState("");
    const [selectedStandard, setSelectedStandard] = useState("");
    const [selectedBatch, setSelectedBatch] = useState("");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
    const [studentToRemove, setStudentToRemove] = useState(null);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const loadProfile = async () => {
            const storedRole = localStorage.getItem("role") || "student";
            setRole(storedRole);
            if (!token || (storedRole !== "staff" && storedRole !== "admin")) {
                navigate("/dashboard");
                return;
            }

            try {
                const profile = await getProfile(token);
                setUser(profile);
                if (profile.role) setRole(profile.role);
            } catch (profileError) {
                setUser({ ...fallbackUser, role: storedRole });
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, [navigate, token]);

    useEffect(() => {
        const loadFilters = async () => {
            try {
                const headers = { "Authorization": `Bearer ${token}` };
                const [standardsRes, batchesRes] = await Promise.all([
                    fetch("http://localhost:5000/api/admin/standards", { headers }),
                    fetch("http://localhost:5000/api/admin/batches", { headers })
                ]);
                if (standardsRes.ok) setStandards(await standardsRes.json());
                if (batchesRes.ok) setBatches(await batchesRes.json());
            } catch (filterError) {
                setError("Could not load class and batch filters.");
            }
        };

        if (!loading) loadFilters();
    }, [loading, token]);

    const loadStudents = useCallback(async () => {
        if (!token) return;

        setError("");
        const params = new URLSearchParams({ page: page.toString(), limit: "10" });
        if (search.trim()) params.set("search", search.trim());
        if (selectedStandard) params.set("standardId", selectedStandard);
        if (selectedBatch) params.set("batchId", selectedBatch);

        try {
            const res = await fetch(`http://localhost:5000/api/admin/students?${params.toString()}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setStudents(data.students || []);
            setPagination(data.pagination || { page: 1, total: 0, totalPages: 1 });
        } catch (studentError) {
            setError(studentError.message || "Could not load students.");
        }
    }, [page, search, selectedBatch, selectedStandard, token]);

    useEffect(() => {
        if (!loading) loadStudents();
    }, [loading, loadStudents]);

    const availableBatches = useMemo(() => (
        batches.filter((batch) => !selectedStandard || batch.standard_id === parseInt(selectedStandard))
    ), [batches, selectedStandard]);

    const handleLogout = async () => {
        try {
            if (token) await logoutUser(token);
        } catch (logoutError) {
            console.error("Logout failed", logoutError);
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            navigate("/login");
        }
    };

    const removeStudent = async () => {
        if (!studentToRemove) return;

        try {
            const res = await fetch(`http://localhost:5000/api/admin/students/${studentToRemove.id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setMessage(`${studentToRemove.name} was removed.`);
            setStudentToRemove(null);
            loadStudents();
        } catch (removeError) {
            setError(removeError.message || "Could not remove student.");
        }
    };

    if (loading) return null;

    return (
        <div className="dashboard-layout">
            <Navbar role={role} user={user} onLogout={handleLogout} />
            <div className="dashboard-main-container">
                <div className="page-container">
                    <div className="page-header">
                        <h2><i className="fas fa-user-graduate"></i> Manage Students</h2>
                        <span className="subtitle">Registered students by class and batch</span>
                    </div>

                    {(message || error) && (
                        <div
                            className={`portal-badge ${error ? "danger" : "success"}`}
                            style={{ display: "block", marginBottom: "16px", padding: "12px 16px", textAlign: "center" }}
                        >
                            {error || message}
                        </div>
                    )}

                    <div className="portal-card" style={{ marginBottom: "20px" }}>
                        <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
                            <div className="portal-form-group">
                                <label>Search Students</label>
                                <input
                                    type="search"
                                    className="portal-form-input"
                                    placeholder="Name, email, or mobile"
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                />
                            </div>
                            <div className="portal-form-group">
                                <label>Class / Standard</label>
                                <select
                                    className="portal-form-input"
                                    value={selectedStandard}
                                    onChange={(e) => {
                                        setSelectedStandard(e.target.value);
                                        setSelectedBatch("");
                                        setPage(1);
                                    }}
                                >
                                    <option value="">All Classes</option>
                                    {standards.map((standard) => <option key={standard.id} value={standard.id}>{standard.name}</option>)}
                                </select>
                            </div>
                            <div className="portal-form-group">
                                <label>Batch</label>
                                <select
                                    className="portal-form-input"
                                    value={selectedBatch}
                                    onChange={(e) => {
                                        setSelectedBatch(e.target.value);
                                        setPage(1);
                                    }}
                                >
                                    <option value="">All Batches</option>
                                    {availableBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="portal-card">
                        <div className="table-responsive">
                            <table className="portal-table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Email</th>
                                        <th>Mobile</th>
                                        <th>Standard</th>
                                        <th>Batch</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.length > 0 ? students.map((student) => (
                                        <tr key={student.id}>
                                            <td>
                                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                    <span className="summary-card-icon" style={{ width: "34px", height: "34px", minWidth: "34px", fontSize: "14px" }}>
                                                        <i className="fas fa-user"></i>
                                                    </span>
                                                    <strong>{student.name}</strong>
                                                </div>
                                            </td>
                                            <td>{student.email}</td>
                                            <td>{student.mobile || "-"}</td>
                                            <td>{student.standard_name || "-"}</td>
                                            <td>{student.batch_name || "-"}</td>
                                            <td>
                                                <span className={`portal-badge ${student.is_active ? "success" : "warning"}`}>
                                                    {student.is_active ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="portal-btn outline-danger"
                                                    style={{ padding: "5px 10px", fontSize: "12px" }}
                                                    disabled={!student.is_active}
                                                    onClick={() => setStudentToRemove(student)}
                                                >
                                                    <i className="fas fa-user-slash"></i> Remove
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: "center", padding: "28px" }}>No students match the current filters.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginTop: "18px" }}>
                            <span style={{ color: "#718096" }}>{pagination.total} student{pagination.total === 1 ? "" : "s"}</span>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                <button className="portal-btn outline-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                                <span>Page {pagination.page} of {pagination.totalPages}</span>
                                <button className="portal-btn outline-secondary" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Next</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {studentToRemove && (
                <div className="portal-modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" }}>
                    <div className="portal-card" style={{ width: "100%", maxWidth: "430px", background: "#fff" }}>
                        <h3 style={{ marginTop: 0 }}>Remove Student</h3>
                        <p>Remove <strong>{studentToRemove.name}</strong> from active students? Their linked records will remain available for history.</p>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                            <button className="portal-btn outline-secondary" onClick={() => setStudentToRemove(null)}>Cancel</button>
                            <button className="portal-btn danger" onClick={removeStudent}>Remove</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentManagement;
