import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { getProfile, logoutUser } from "../Services/authService";
import "../Styles/dashboard.css";
import "../Styles/pages.css";

// --- STUDENT TESTS COMPONENT ---
const StudentTests = ({ user, handleLogout }) => {
    const [activeTab, setActiveTab] = useState("active");
    const [tests, setTests] = useState([]);
    const token = localStorage.getItem("token");

    const fetchTests = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/tests", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) setTests(await res.json());
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchTests();
    }, []);

    const activeTests = tests.filter(t => t.submissionStatus === "Pending");
    const completedTests = tests.filter(t => t.submissionStatus === "Graded" || t.score !== "N/A");

    const handleStartTest = (test) => {
        const confirmStart = window.confirm(`Important Notice:\n\nThis will open the online exam document for "${test.title}".\nDo you want to start this assessment now?`);
        if (confirmStart) {
            // Open file in new window/tab
            const viewUrl = `http://localhost:5000/api/tests/view/${test.id}`;
            window.open(viewUrl, "_blank");
        }
    };

    return (
        <div className="dashboard-layout">
            <Navbar role="student" user={user} onLogout={handleLogout} />
            <div className="dashboard-main-container">
                <div className="page-container">
                    <div className="page-header">
                        <h2><i className="fas fa-file-signature"></i> Online Tests & Mock Exams</h2>
                    </div>

                    <div className="notification-tabs" style={{ marginBottom: "25px", borderBottom: "1px solid #cbd5e1" }}>
                        <button 
                            onClick={() => setActiveTab("active")}
                            className={`tab-btn ${activeTab === "active" ? "active" : ""}`}
                            style={{ paddingBottom: "10px", fontSize: "14px", fontWeight: "bold" }}
                        >
                            Active & Upcoming Tests ({activeTests.length})
                        </button>
                        <button 
                            onClick={() => setActiveTab("completed")}
                            className={`tab-btn ${activeTab === "completed" ? "active" : ""}`}
                            style={{ paddingBottom: "10px", fontSize: "14px", fontWeight: "bold" }}
                        >
                            Completed Assessments ({completedTests.length})
                        </button>
                    </div>

                    {activeTab === "active" ? (
                        activeTests.length > 0 ? (
                            <div className="tests-grid">
                                {activeTests.map(test => (
                                    <div key={test.id} className="test-item-card active">
                                        <div className="test-header">
                                            <h3>{test.title}</h3>
                                            <span className="portal-badge info" style={{ whiteSpace: "nowrap" }}>{test.subject_name}</span>
                                        </div>
                                        <div className="test-meta-info">
                                            <span><i className="far fa-check-square"></i> Max Marks: <strong>{test.total_marks} Marks</strong></span>
                                            <span style={{ color: "var(--accent-color)" }}><i className="far fa-calendar-times"></i> Test Date: <strong>{new Date(test.test_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
                                        </div>
                                        <div className="test-footer">
                                            <span style={{ fontSize: "11px", color: "#718096" }}>Status: {test.submissionStatus}</span>
                                            <button onClick={() => handleStartTest(test)} className="portal-btn danger sm">
                                                <i className="fas fa-play" style={{ fontSize: "10px" }}></i> View Paper / Start
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="portal-card">
                                <div className="no-record-box">
                                    <i className="fas fa-laugh-beam"></i>
                                    <h4>No Active Tests!</h4>
                                    <p>You have no pending online tests or assignments scheduled for today.</p>
                                </div>
                            </div>
                        )
                    ) : (
                        completedTests.length > 0 ? (
                            <div className="tests-grid">
                                {completedTests.map(test => (
                                    <div key={test.id} className="test-item-card completed">
                                        <div className="test-header">
                                            <h3>{test.title}</h3>
                                            <span className="portal-badge success" style={{ whiteSpace: "nowrap" }}>{test.subject_name}</span>
                                        </div>
                                        <div className="test-meta-info" style={{ marginBottom: "12px" }}>
                                            <span><i className="far fa-calendar-check"></i> Date: <strong>{new Date(test.test_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
                                            <span><i className="fas fa-check-double"></i> Status: <strong style={{ color: "#2ecc71" }}>{test.submissionStatus}</strong></span>
                                        </div>
                                        <div className="test-footer">
                                            <div className="test-score">Obtained Score: <span>{test.score} / {test.total_marks}</span></div>
                                            <span className="portal-badge success" style={{ borderRadius: "4px" }}>
                                                {((parseFloat(test.score) / test.total_marks) * 100).toFixed(0)}% Score
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="portal-card">
                                <div className="no-record-box">
                                    <i className="fas fa-folder-open"></i>
                                    <h4>No Completed Assessments</h4>
                                    <p>Your previous online test history logs are empty.</p>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

// --- STAFF TESTS COMPONENT ---
const StaffTests = ({ user, handleLogout, role }) => {
    const [activeTab, setActiveTab] = useState("tests"); // tests, submissions
    const [showModal, setShowModal] = useState(false);
    const [testList, setTestList] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [batches, setBatches] = useState([]);
    
    // Submissions filter
    const [selectedTestId, setSelectedTestId] = useState("");

    const [formData, setFormData] = useState({
        id: null,
        title: "",
        subjectId: "",
        batchId: "",
        totalMarks: "",
        testDate: "",
        instructions: ""
    });
    const [fileToUpload, setFileToUpload] = useState(null);

    const token = localStorage.getItem("token");

    const loadSubjects = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/admin/subjects");
            if (res.ok) setSubjects(await res.json());
        } catch (e) { console.error(e); }
    };

    const loadBatches = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/admin/batches");
            if (res.ok) setBatches(await res.json());
        } catch (e) { console.error(e); }
    };

    const loadTests = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/tests", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTestList(data);
                if (data.length > 0 && !selectedTestId) {
                    setSelectedTestId(data[0].id.toString());
                }
            }
        } catch (e) { console.error(e); }
    };

    const loadSubmissions = async () => {
        if (!selectedTestId) return;
        try {
            const res = await fetch(`http://localhost:5000/api/tests/${selectedTestId}/submissions`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) setSubmissions(await res.json());
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        loadSubjects();
        loadBatches();
        loadTests();
    }, []);

    useEffect(() => {
        loadSubmissions();
    }, [selectedTestId]);

    const handleAdd = () => {
        setFormData({ id: null, title: "", subjectId: "", batchId: "", totalMarks: "", testDate: "", instructions: "" });
        setFileToUpload(null);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if(window.confirm("Are you sure you want to delete this test?")) {
            try {
                const res = await fetch(`http://localhost:5000/api/tests/${id}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    setTestList(testList.filter(t => t.id !== id));
                } else {
                    alert("Error deleting test.");
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.subjectId || !formData.batchId || !formData.totalMarks || !formData.testDate) return;

        const body = new FormData();
        if (fileToUpload) body.append("file", fileToUpload);
        body.append("title", formData.title);
        body.append("subjectId", formData.subjectId);
        body.append("batchId", formData.batchId);
        body.append("totalMarks", formData.totalMarks);
        body.append("testDate", formData.testDate);
        body.append("instructions", formData.instructions);

        try {
            const res = await fetch("http://localhost:5000/api/tests", {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body
            });
            if (res.ok) {
                loadTests();
                setShowModal(false);
            } else {
                alert("Failed to save test.");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleGradeSubmission = async (sub) => {
        const score = window.prompt(`Enter marks obtained for ${sub.studentName} (Out of total marks):`);
        if (score !== null && score !== "") {
            try {
                const res = await fetch("http://localhost:5000/api/tests/grade", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        testId: parseInt(selectedTestId),
                        studentId: sub.studentId,
                        score: parseFloat(score),
                        status: "Graded"
                    })
                });

                if (res.ok) {
                    loadSubmissions();
                } else {
                    alert("Failed to save grading.");
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    return (
        <div className="dashboard-layout">
            <Navbar role={role} user={user} onLogout={handleLogout} />
            <div className="dashboard-main-container">
                <div className="page-container">
                    <div className="page-header">
                        <h2><i className="fas fa-file-signature"></i> Test & Exam Management</h2>
                        <div className="header-actions">
                            <button className="portal-btn primary" onClick={handleAdd}>
                                <i className="fas fa-plus"></i> Create New Test
                            </button>
                        </div>
                    </div>

                    <div className="notification-tabs" style={{ marginBottom: "25px", borderBottom: "1px solid #cbd5e1" }}>
                        <button 
                            onClick={() => setActiveTab("tests")}
                            className={`tab-btn ${activeTab === "tests" ? "active" : ""}`}
                            style={{ paddingBottom: "10px", fontSize: "14px", fontWeight: "bold" }}
                        >
                            Manage Tests ({testList.length})
                        </button>
                        <button 
                            onClick={() => setActiveTab("submissions")}
                            className={`tab-btn ${activeTab === "submissions" ? "active" : ""}`}
                            style={{ paddingBottom: "10px", fontSize: "14px", fontWeight: "bold" }}
                        >
                            View Submissions
                        </button>
                    </div>

                    {activeTab === "tests" ? (
                        <div className="portal-card">
                            {testList.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="portal-table">
                                        <thead>
                                            <tr>
                                                <th>Title</th>
                                                <th>Subject</th>
                                                <th>Batch</th>
                                                <th>Total Marks</th>
                                                <th>Test Date</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {testList.map(t => (
                                                <tr key={t.id}>
                                                    <td><strong>{t.title}</strong></td>
                                                    <td><span className="portal-badge outline-primary">{t.subject_name}</span></td>
                                                    <td><span className="portal-badge info">{t.batch_name}</span></td>
                                                    <td>{t.total_marks} Marks</td>
                                                    <td>{new Date(t.test_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            {t.file_path && (
                                                                <a href={`http://localhost:5000/api/tests/view/${t.id}`} target="_blank" rel="noopener noreferrer" className="portal-btn outline-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>
                                                                    <i className="fas fa-eye"></i> View Paper
                                                                </a>
                                                            )}
                                                            <button className="portal-btn outline-danger" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleDelete(t.id)}>
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
                                    <i className="fas fa-file-alt"></i>
                                    <h4>No Tests Created Yet</h4>
                                    <p>Create a test to assign it to classes/batches.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            {/* Test Selector Dropdown */}
                            <div className="portal-form-group" style={{ maxWidth: "400px", marginBottom: "20px" }}>
                                <label>Select Assessment / Test:</label>
                                <select className="form-input" value={selectedTestId} onChange={(e) => setSelectedTestId(e.target.value)}>
                                    <option value="">-- Choose Test --</option>
                                    {testList.map(t => (
                                        <option key={t.id} value={t.id}>{t.title} ({t.batch_name})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="portal-card">
                                {submissions.length > 0 ? (
                                    <div className="table-responsive">
                                        <table className="portal-table">
                                            <thead>
                                                <tr>
                                                    <th>Student Name</th>
                                                    <th>Email</th>
                                                    <th>Score</th>
                                                    <th>Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {submissions.map(s => (
                                                    <tr key={s.studentId}>
                                                        <td><strong>{s.studentName}</strong></td>
                                                        <td>{s.email}</td>
                                                        <td>{s.score !== "" ? s.score : "N/A"}</td>
                                                        <td>
                                                            <span className={`portal-badge ${s.status === "Graded" ? "success" : "warning"}`}>{s.status}</span>
                                                        </td>
                                                        <td>
                                                            <button className="portal-btn primary sm" onClick={() => handleGradeSubmission(s)}>
                                                                {s.status === "Graded" ? "Re-grade" : "Grade Now"}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="no-record-box">
                                        <i className="fas fa-tasks"></i>
                                        <h4>No Student Submissions</h4>
                                        <p>Select a test above or wait for student registration updates.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Test Creation Modal */}
            {showModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="modal-content" style={{
                        backgroundColor: '#fff', padding: '24px', borderRadius: '8px',
                        width: '100%', maxWidth: '550px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>Create New Test</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>&times;</button>
                        </div>
                        
                        <form onSubmit={handleSave}>
                            <div className="portal-form-group">
                                <label>Test Title</label>
                                <input type="text" className="form-input" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required placeholder="e.g. Unit Test 1" />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="portal-form-group">
                                    <label>Subject</label>
                                    <select className="form-input" value={formData.subjectId} onChange={(e) => setFormData({...formData, subjectId: e.target.value})} required>
                                        <option value="">Select Subject</option>
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.standard_name})</option>)}
                                    </select>
                                </div>
                                <div className="portal-form-group">
                                    <label>Assign to Batch</label>
                                    <select className="form-input" value={formData.batchId} onChange={(e) => setFormData({...formData, batchId: e.target.value})} required>
                                        <option value="">Select Batch</option>
                                        {batches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.standard_name})</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="portal-form-group">
                                    <label>Total Marks</label>
                                    <input type="number" className="form-input" value={formData.totalMarks} onChange={(e) => setFormData({...formData, totalMarks: e.target.value})} required placeholder="50" />
                                </div>
                                <div className="portal-form-group">
                                    <label>Test Date</label>
                                    <input type="date" className="form-input" value={formData.testDate} onChange={(e) => setFormData({...formData, testDate: e.target.value})} required />
                                </div>
                            </div>

                            <div className="portal-form-group">
                                <label>Upload Test Paper File (PDF/Image)</label>
                                <input type="file" onChange={(e) => e.target.files && setFileToUpload(e.target.files[0])} />
                            </div>

                            <div className="portal-form-group">
                                <label>Instructions (Optional)</label>
                                <textarea className="form-input" rows="3" value={formData.instructions} onChange={(e) => setFormData({...formData, instructions: e.target.value})} placeholder="Guidelines for students..."></textarea>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                                <button type="button" className="portal-btn outline-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="portal-btn primary">Save Test</button>
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
const Tests = () => {
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

    if (role === "staff" || role === "admin" || role === "teacher") {
        return <StaffTests user={user} handleLogout={handleLogout} role={role} />;
    }

    return <StudentTests user={user} handleLogout={handleLogout} />;
};

export default Tests;
