import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import "../Styles/dashboard.css";
import "../Styles/pages.css";
import { logoutUser, getProfile } from "../Services/authService";

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("standards");

    // Dynamic Database Lists
    const [standards, setStandards] = useState([]);
    const [batches, setBatches] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);

    // Alerts
    const [alertMsg, setAlertMsg] = useState("");
    const [alertType, setAlertType] = useState("success");

    // Modal Form States
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("add"); // add or edit
    const [editId, setEditId] = useState(null);

    // Form inputs
    const [stdName, setStdName] = useState("");
    const [batchName, setBatchName] = useState("");
    const [batchStdId, setBatchStdId] = useState("");
    const [subName, setSubName] = useState("");
    const [subStdId, setSubStdId] = useState("");
    const [teacherName, setTeacherName] = useState("");
    const [teacherEmail, setTeacherEmail] = useState("");
    const [teacherMobile, setTeacherMobile] = useState("");

    const token = localStorage.getItem("token");

    useEffect(() => {
        const fetchProfile = async () => {
            const role = localStorage.getItem("role");
            if (!token || role !== "admin") {
                navigate("/");
                return;
            }
            try {
                const userData = await getProfile(token);
                setUser(userData);
            } catch (error) {
                console.error("Failed to load user profile", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [navigate, token]);

    // Load Data
    const loadStandards = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/admin/standards");
            if (res.ok) setStandards(await res.json());
        } catch (e) { console.error(e); }
    };

    const loadBatches = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/admin/batches");
            if (res.ok) setBatches(await res.json());
        } catch (e) { console.error(e); }
    };

    const loadSubjects = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/admin/subjects");
            if (res.ok) setSubjects(await res.json());
        } catch (e) { console.error(e); }
    };

    const loadTeachers = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/admin/teachers");
            if (res.ok) setTeachers(await res.json());
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (!loading) {
            loadStandards();
            loadBatches();
            loadSubjects();
            loadTeachers();
        }
    }, [loading]);

    const handleLogout = async () => {
        try {
            if (token) await logoutUser(token);
        } catch (error) {
            console.error("Failed to record logout", error);
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            navigate("/");
        }
    };

    const showAlert = (msg, type = "success") => {
        setAlertMsg(msg);
        setAlertType(type);
        setTimeout(() => setAlertMsg(""), 4000);
    };

    // Open Modal Helpers
    const openAddModal = () => {
        setModalMode("add");
        setEditId(null);
        // Clear all fields
        setStdName("");
        setBatchName("");
        setBatchStdId("");
        setSubName("");
        setSubStdId("");
        setTeacherName("");
        setTeacherEmail("");
        setTeacherMobile("");
        setShowModal(true);
    };

    const openEditModal = (type, item) => {
        setModalMode("edit");
        setEditId(item.id);
        if (type === "standard") {
            setStdName(item.name);
        } else if (type === "batch") {
            setBatchName(item.name);
            setBatchStdId(item.standard_id);
        } else if (type === "subject") {
            setSubName(item.name);
            setSubStdId(item.standard_id);
        } else if (type === "teacher") {
            setTeacherName(item.name);
            setTeacherEmail(item.email);
            setTeacherMobile(item.mobile);
        }
        setShowModal(true);
    };

    // Form Submission
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        let url = "";
        let method = "POST";
        let body = {};

        if (activeTab === "standards") {
            url = modalMode === "add" ? "http://localhost:5000/api/admin/standards" : `http://localhost:5000/api/admin/standards/${editId}`;
            method = modalMode === "add" ? "POST" : "PUT";
            body = { name: stdName };
        } else if (activeTab === "batches") {
            url = modalMode === "add" ? "http://localhost:5000/api/admin/batches" : `http://localhost:5000/api/admin/batches/${editId}`;
            method = modalMode === "add" ? "POST" : "PUT";
            body = { name: batchName, standardId: parseInt(batchStdId) };
        } else if (activeTab === "subjects") {
            url = modalMode === "add" ? "http://localhost:5000/api/admin/subjects" : `http://localhost:5000/api/admin/subjects/${editId}`;
            method = modalMode === "add" ? "POST" : "PUT";
            body = { name: subName, standardId: parseInt(subStdId) };
        } else if (activeTab === "teachers") {
            url = modalMode === "add" ? "http://localhost:5000/api/admin/teachers" : `http://localhost:5000/api/admin/teachers/${editId}`;
            method = modalMode === "add" ? "POST" : "PUT";
            body = { name: teacherName, email: teacherEmail, mobile: teacherMobile };
        }

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                showAlert(`${activeTab.slice(0, -1)} saved successfully!`);
                setShowModal(false);
                // Reload
                if (activeTab === "standards") loadStandards();
                else if (activeTab === "batches") loadBatches();
                else if (activeTab === "subjects") loadSubjects();
                else if (activeTab === "teachers") loadTeachers();
            } else {
                const errData = await res.json();
                showAlert(errData.message || "Failed to save record.", "danger");
            }
        } catch (err) {
            showAlert("Connection error.", "danger");
        }
    };

    // Delete Action
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this item?")) return;
        try {
            const res = await fetch(`http://localhost:5000/api/admin/${activeTab}/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                showAlert(`${activeTab.slice(0, -1)} deleted successfully!`);
                if (activeTab === "standards") loadStandards();
                else if (activeTab === "batches") loadBatches();
                else if (activeTab === "subjects") loadSubjects();
                else if (activeTab === "teachers") loadTeachers();
            } else {
                showAlert("Error deleting record", "danger");
            }
        } catch (e) {
            showAlert("Server connection failed.", "danger");
        }
    };

    if (loading) return null;

    return (
        <div className="dashboard-layout">
            <Navbar user={user} onLogout={handleLogout} role="admin" />

            <div className="dashboard-main-container">
                <div className="page-container">
                    
                    {/* Header */}
                    <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <h2><i className="fas fa-sliders-h"></i> Admin Console</h2>
                            <span className="subtitle">Configure Coaching Standards, Batches, Subjects, and Faculty</span>
                        </div>
                        <button className="portal-btn primary" onClick={openAddModal}>
                            <i className="fas fa-plus"></i> Add {activeTab === "standards" ? "Standard" : activeTab === "batches" ? "Batch" : activeTab === "subjects" ? "Subject" : "Teacher"}
                        </button>
                    </div>

                    {/* Alert Toast */}
                    {alertMsg && (
                        <div className={`portal-badge ${alertType}`} style={{ display: "block", width: "fit-content", margin: "10px auto", padding: "12px 24px", borderRadius: "8px", fontSize: "14px", textAlign: "center" }}>
                            <i className={alertType === "success" ? "fas fa-check-circle" : "fas fa-exclamation-triangle"} style={{ marginRight: "8px" }}></i>
                            {alertMsg}
                        </div>
                    )}

                    {/* Navigation Tabs */}
                    <div className="tab-navigation" style={{ display: "flex", gap: "10px", margin: "25px 0", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px" }}>
                        <button className={`portal-btn ${activeTab === "standards" ? "primary" : "outline-secondary"}`} onClick={() => setActiveTab("standards")}>
                            <i className="fas fa-graduation-cap"></i> Standards / Classes
                        </button>
                        <button className={`portal-btn ${activeTab === "batches" ? "primary" : "outline-secondary"}`} onClick={() => setActiveTab("batches")}>
                            <i className="fas fa-users"></i> Batches
                        </button>
                        <button className={`portal-btn ${activeTab === "subjects" ? "primary" : "outline-secondary"}`} onClick={() => setActiveTab("subjects")}>
                            <i className="fas fa-book"></i> Subjects
                        </button>
                        <button className={`portal-btn ${activeTab === "teachers" ? "primary" : "outline-secondary"}`} onClick={() => setActiveTab("teachers")}>
                            <i className="fas fa-chalkboard-teacher"></i> Faculty/Teachers
                        </button>
                    </div>

                    {/* Dynamic Table Card */}
                    <div className="portal-card blue-theme">
                        <table className="portal-table">
                            <thead>
                                {activeTab === "standards" && (
                                    <tr>
                                        <th>ID</th>
                                        <th>Standard Name</th>
                                        <th>Actions</th>
                                    </tr>
                                )}
                                {activeTab === "batches" && (
                                    <tr>
                                        <th>ID</th>
                                        <th>Batch Name</th>
                                        <th>Standard / Class</th>
                                        <th>Actions</th>
                                    </tr>
                                )}
                                {activeTab === "subjects" && (
                                    <tr>
                                        <th>ID</th>
                                        <th>Subject Name</th>
                                        <th>Standard / Class</th>
                                        <th>Actions</th>
                                    </tr>
                                )}
                                {activeTab === "teachers" && (
                                    <tr>
                                        <th>ID</th>
                                        <th>Teacher Name</th>
                                        <th>Email</th>
                                        <th>Mobile</th>
                                        <th>Actions</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {activeTab === "standards" && standards.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.id}</td>
                                        <td><strong>{item.name}</strong></td>
                                        <td>
                                            <button className="portal-btn outline-primary" style={{ padding: "4px 8px", fontSize: "12px", marginRight: "5px" }} onClick={() => openEditModal("standard", item)}>
                                                <i className="fas fa-edit"></i> Edit
                                            </button>
                                            <button className="portal-btn outline-danger" style={{ padding: "4px 8px", fontSize: "12px" }} onClick={() => handleDelete(item.id)}>
                                                <i className="fas fa-trash"></i> Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {activeTab === "batches" && batches.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.id}</td>
                                        <td><strong>{item.name}</strong></td>
                                        <td><span className="portal-badge info">{item.standard_name}</span></td>
                                        <td>
                                            <button className="portal-btn outline-primary" style={{ padding: "4px 8px", fontSize: "12px", marginRight: "5px" }} onClick={() => openEditModal("batch", item)}>
                                                <i className="fas fa-edit"></i> Edit
                                            </button>
                                            <button className="portal-btn outline-danger" style={{ padding: "4px 8px", fontSize: "12px" }} onClick={() => handleDelete(item.id)}>
                                                <i className="fas fa-trash"></i> Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {activeTab === "subjects" && subjects.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.id}</td>
                                        <td><strong>{item.name}</strong></td>
                                        <td><span className="portal-badge info">{item.standard_name}</span></td>
                                        <td>
                                            <button className="portal-btn outline-primary" style={{ padding: "4px 8px", fontSize: "12px", marginRight: "5px" }} onClick={() => openEditModal("subject", item)}>
                                                <i className="fas fa-edit"></i> Edit
                                            </button>
                                            <button className="portal-btn outline-danger" style={{ padding: "4px 8px", fontSize: "12px" }} onClick={() => handleDelete(item.id)}>
                                                <i className="fas fa-trash"></i> Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {activeTab === "teachers" && teachers.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.id}</td>
                                        <td><strong>{item.name}</strong></td>
                                        <td>{item.email}</td>
                                        <td>{item.mobile}</td>
                                        <td>
                                            <button className="portal-btn outline-primary" style={{ padding: "4px 8px", fontSize: "12px", marginRight: "5px" }} onClick={() => openEditModal("teacher", item)}>
                                                <i className="fas fa-edit"></i> Edit
                                            </button>
                                            <button className="portal-btn outline-danger" style={{ padding: "4px 8px", fontSize: "12px" }} onClick={() => handleDelete(item.id)}>
                                                <i className="fas fa-trash"></i> Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {((activeTab === "standards" && standards.length === 0) ||
                                  (activeTab === "batches" && batches.length === 0) ||
                                  (activeTab === "subjects" && subjects.length === 0) ||
                                  (activeTab === "teachers" && teachers.length === 0)) && (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: "center", padding: "30px", color: "#a0aec0" }}>
                                            <i className="fas fa-folder-open fa-2x" style={{ marginBottom: "10px", display: "block" }}></i>
                                            No database entries found for {activeTab}. Click "Add" above to register entries.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>

            {/* Config modal popup */}
            {showModal && (
                <div className="portal-modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div className="portal-card" style={{ width: "450px", backgroundColor: "#fff", padding: "24px", borderRadius: "12px", boxShadow: "0 10px 15px rgba(0,0,0,0.1)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "20px" }}>
                            <h3>{modalMode === "add" ? "Add New" : "Edit"} {activeTab.slice(0, -1)}</h3>
                            <button style={{ background: "transparent", border: "none", fontSize: "18px", cursor: "pointer", color: "#a0aec0" }} onClick={() => setShowModal(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="portal-form">
                            {activeTab === "standards" && (
                                <div className="portal-form-group">
                                    <label>Standard / Class Name</label>
                                    <input type="text" className="portal-form-input" required placeholder="e.g. Standard 10" value={stdName} onChange={(e) => setStdName(e.target.value)} />
                                </div>
                            )}

                            {activeTab === "batches" && (
                                <>
                                    <div className="portal-form-group">
                                        <label>Batch Name</label>
                                        <input type="text" className="portal-form-input" required placeholder="e.g. Morning Batch" value={batchName} onChange={(e) => setBatchName(e.target.value)} />
                                    </div>
                                    <div className="portal-form-group">
                                        <label>Under Standard / Class</label>
                                        <select className="portal-form-input" required value={batchStdId} onChange={(e) => setBatchStdId(e.target.value)}>
                                            <option value="">Select standard</option>
                                            {standards.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}

                            {activeTab === "subjects" && (
                                <>
                                    <div className="portal-form-group">
                                        <label>Subject Name</label>
                                        <input type="text" className="portal-form-input" required placeholder="e.g. Science" value={subName} onChange={(e) => setSubName(e.target.value)} />
                                    </div>
                                    <div className="portal-form-group">
                                        <label>Under Standard / Class</label>
                                        <select className="portal-form-input" required value={subStdId} onChange={(e) => setSubStdId(e.target.value)}>
                                            <option value="">Select standard</option>
                                            {standards.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}

                            {activeTab === "teachers" && (
                                <>
                                    <div className="portal-form-group">
                                        <label>Teacher Name</label>
                                        <input type="text" className="portal-form-input" required placeholder="Full Name" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
                                    </div>
                                    <div className="portal-form-group">
                                        <label>Email Address</label>
                                        <input type="email" className="portal-form-input" required placeholder="email@navkar.com" value={teacherEmail} onChange={(e) => setTeacherEmail(e.target.value)} />
                                    </div>
                                    <div className="portal-form-group">
                                        <label>Mobile Number</label>
                                        <input type="text" className="portal-form-input" required placeholder="Contact Number" value={teacherMobile} onChange={(e) => setTeacherMobile(e.target.value)} />
                                    </div>
                                </>
                            )}

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "25px" }}>
                                <button type="button" className="portal-btn outline-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="portal-btn primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
