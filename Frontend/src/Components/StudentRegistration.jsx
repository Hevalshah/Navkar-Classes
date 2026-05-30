import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { getProfile, logoutUser, registerStudent } from "../Services/authService";
import "../Styles/dashboard.css";
import "../Styles/pages.css";

const fallbackUser = {
    name: "User (Demo Mode)",
    role: "student",
    profileImg: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
};

const StudentRegistration = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [role, setRole] = useState("student");
    const [loading, setLoading] = useState(true);

    // Form inputs state — only 4 fields required
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [selectedStandard, setSelectedStandard] = useState("");
    const [selectedBatch, setSelectedBatch] = useState("");
    const [password, setPassword] = useState("");

    // Dynamic Standards List
    const [standards, setStandards] = useState([]);
    const [batches, setBatches] = useState([]);

    // Message status states
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem("token");
            const storedRole = localStorage.getItem("role") || "student";
            setRole(storedRole);

            // Route Protection: If not staff or admin, redirect back
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

        const loadAcademicOptions = async () => {
            try {
                const token = localStorage.getItem("token");
                const headers = { "Authorization": `Bearer ${token}` };
                const stdRes = await fetch("http://localhost:5000/api/admin/standards", {
                    headers
                });
                const batchRes = await fetch("http://localhost:5000/api/admin/batches", {
                    headers
                });
                if (stdRes.ok) {
                    const stdData = await stdRes.json();
                    setStandards(stdData);
                }
                if (batchRes.ok) {
                    setBatches(await batchRes.json());
                }
            } catch (err) {
                console.error("Failed to load academic options", err);
            }
        };
        loadAcademicOptions();
    }, [navigate]);

    const handleLogout = async () => {
        const token = localStorage.getItem("token");
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

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setSuccessMessage("");
        setErrorMessage("");
        setIsSubmitting(true);

        const selectedStd = standards.find(s => s.id === parseInt(selectedStandard));
        const selectedBatchRecord = batches.find(b => b.id === parseInt(selectedBatch));

        const payload = {
            name: fullName,
            email,
            course: selectedStd?.name || "",
            standardId: parseInt(selectedStandard),
            batchId: parseInt(selectedBatch),
            assignedBatch: selectedBatchRecord?.name || "",
            password
        };

        try {
            const data = await registerStudent(payload, localStorage.getItem("token"));
            setSuccessMessage(data.message || "Student registered successfully! They can complete their profile after logging in.");
            // Reset form fields
            setFullName("");
            setEmail("");
            setSelectedStandard("");
            setSelectedBatch("");
            setPassword("");
        } catch (error) {
            setErrorMessage(error.message || "Registration failed. Please check inputs.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return null;

    const availableBatches = batches.filter((batch) => batch.standard_id === parseInt(selectedStandard));

    return (
        <div className="dashboard-layout">
            <Navbar role={role} user={user} onLogout={handleLogout} />

            <div className="dashboard-main-container">
                <div className="page-container">

                    {/* Header */}
                    <div className="page-header">
                        <h2><i className="fas fa-user-plus"></i> Student Registration</h2>
                        <span className="subtitle">Register new students into the system</span>
                    </div>

                    {/* Registration Form Card */}
                    <div className="portal-card blue-theme" style={{ maxWidth: "700px", margin: "20px auto" }}>
                        <div className="card-header-styled" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "15px", marginBottom: "25px" }}>
                            <h3 style={{ margin: 0, color: "#2d3748" }}>Student Enrolment Form</h3>
                            <p style={{ margin: "5px 0 0 0", fontSize: "13px", color: "#718096" }}>
                                Enter the basic details to create student login credentials. The student can complete their full profile after logging in.
                            </p>
                        </div>

                        {successMessage && (
                            <div className="portal-badge success" style={{ display: "block", padding: "12px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", textAlign: "center" }}>
                                <i className="fas fa-check-circle" style={{ marginRight: "8px" }}></i> {successMessage}
                            </div>
                        )}

                        {errorMessage && (
                            <div className="portal-badge danger" style={{ display: "block", padding: "12px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", textAlign: "center", backgroundColor: "#fed7d7", color: "#c53030" }}>
                                <i className="fas fa-exclamation-triangle" style={{ marginRight: "8px" }}></i> {errorMessage}
                            </div>
                        )}

                        <form onSubmit={handleRegisterSubmit} className="portal-form">

                            {/* Full Name */}
                            <div className="portal-form-group">
                                <label><i className="fas fa-user" style={{ marginRight: "6px", color: "var(--primary-color)" }}></i> Full Name <span style={{ color: "var(--accent-color)" }}>*</span></label>
                                <input
                                    type="text"
                                    className="portal-form-input"
                                    placeholder="Enter student's full name"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Email Address */}
                            <div className="portal-form-group">
                                <label><i className="fas fa-envelope" style={{ marginRight: "6px", color: "var(--primary-color)" }}></i> Email Address <span style={{ color: "var(--accent-color)" }}>*</span></label>
                                <input
                                    type="email"
                                    className="portal-form-input"
                                    placeholder="Enter student's email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Standard / Class */}
                            <div className="portal-form-group">
                                <label><i className="fas fa-graduation-cap" style={{ marginRight: "6px", color: "var(--primary-color)" }}></i> Class / Standard <span style={{ color: "var(--accent-color)" }}>*</span></label>
                                <select
                                    className="portal-form-input"
                                    value={selectedStandard}
                                    onChange={(e) => {
                                        setSelectedStandard(e.target.value);
                                        setSelectedBatch("");
                                    }}
                                    required
                                >
                                    <option value="">Select Standard / Class</option>
                                    {standards.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Batch */}
                            <div className="portal-form-group">
                                <label><i className="fas fa-users" style={{ marginRight: "6px", color: "var(--primary-color)" }}></i> Batch <span style={{ color: "var(--accent-color)" }}>*</span></label>
                                <select
                                    className="portal-form-input"
                                    value={selectedBatch}
                                    onChange={(e) => setSelectedBatch(e.target.value)}
                                    required
                                    disabled={!selectedStandard}
                                >
                                    <option value="">{selectedStandard ? "Select Batch" : "Select Class First"}</option>
                                    {availableBatches.map((batch) => (
                                        <option key={batch.id} value={batch.id}>{batch.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Temporary Password */}
                            <div className="portal-form-group">
                                <label><i className="fas fa-lock" style={{ marginRight: "6px", color: "var(--primary-color)" }}></i> Temporary Password <span style={{ color: "var(--accent-color)" }}>*</span></label>
                                <input
                                    type="password"
                                    className="portal-form-input"
                                    placeholder="Set a temporary login password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <small style={{ color: "#718096", fontSize: "12px", marginTop: "4px", display: "block" }}>
                                    <i className="fas fa-info-circle" style={{ marginRight: "4px" }}></i>
                                    The student can change this password after logging in via their profile.
                                </small>
                            </div>

                            {/* Info Banner */}
                            <div style={{ background: "#ebf8ff", border: "1px solid #bee3f8", borderRadius: "8px", padding: "12px 16px", marginTop: "10px", marginBottom: "20px", fontSize: "13px", color: "#2b6cb0" }}>
                                <i className="fas fa-info-circle" style={{ marginRight: "6px" }}></i>
                                <strong>Note:</strong> After registration, the student can log in and complete their profile — including mobile number, parent's name, address, and username.
                            </div>

                            {/* Actions */}
                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                                <button
                                    type="submit"
                                    className="portal-btn primary"
                                    disabled={isSubmitting}
                                    style={{ padding: "12px 30px", fontSize: "15px" }}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin" style={{ marginRight: "8px" }}></i> Registering Student...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-user-plus" style={{ marginRight: "8px" }}></i> Register Student
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default StudentRegistration;
