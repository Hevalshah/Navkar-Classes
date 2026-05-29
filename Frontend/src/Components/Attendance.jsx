import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { getProfile, logoutUser } from "../Services/authService";
import "../Styles/dashboard.css";
import "../Styles/pages.css";

// --- STUDENT ATTENDANCE COMPONENT ---
const StudentAttendance = ({ user, handleLogout }) => {
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const token = localStorage.getItem("token");

    const fetchAttendanceHistory = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/attendance/history", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) setAttendanceRecords(await res.json());
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchAttendanceHistory();
    }, []);

    const totalLectures = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(r => r.status === "Present").length;
    const lateCount = attendanceRecords.filter(r => r.status === "Late").length;
    const absentCount = attendanceRecords.filter(r => r.status === "Absent").length;
    const attendancePercentage = totalLectures > 0 
        ? Math.round(((presentCount + lateCount * 0.7) / totalLectures) * 100) 
        : 0;

    const getStatusBadge = (status) => {
        switch (status) {
            case "Present": return <span className="portal-badge success">Present</span>;
            case "Absent": return <span className="portal-badge danger">Absent</span>;
            case "Late": return <span className="portal-badge warning">Late</span>;
            default: return <span className="portal-badge info">{status}</span>;
        }
    };

    return (
        <div className="dashboard-layout">
            <Navbar role="student" user={user} onLogout={handleLogout} />
            <div className="dashboard-main-container">
                <div className="page-container">
                    <div className="page-header">
                        <h2><i className="fas fa-user-check"></i> Attendance History</h2>
                    </div>

                    <div className="summary-grid">
                        <div className="summary-card success">
                            <div className="summary-card-icon"><i className="fas fa-percentage"></i></div>
                            <div className="summary-card-details">
                                <h4>Attendance Rate</h4>
                                <p>{attendancePercentage}%</p>
                            </div>
                        </div>
                        <div className="summary-card primary">
                            <div className="summary-card-icon"><i className="fas fa-chalkboard-teacher"></i></div>
                            <div className="summary-card-details">
                                <h4>Total Conducted</h4>
                                <p>{totalLectures}</p>
                            </div>
                        </div>
                        <div className="summary-card info">
                            <div className="summary-card-icon"><i className="fas fa-check-circle"></i></div>
                            <div className="summary-card-details">
                                <h4>Total Present</h4>
                                <p>{presentCount}</p>
                            </div>
                        </div>
                        <div className="summary-card danger">
                            <div className="summary-card-icon"><i className="fas fa-times-circle"></i></div>
                            <div className="summary-card-details">
                                <h4>Total Absent</h4>
                                <p>{absentCount}</p>
                            </div>
                        </div>
                    </div>

                    <div className="portal-card">
                        {attendanceRecords.length > 0 ? (
                            <div className="table-responsive">
                                <table className="portal-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Batch / Class</th>
                                            <th>Status</th>
                                            <th>Performance Marker</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendanceRecords.map(rec => (
                                            <tr key={rec.id}>
                                                <td><strong>{new Date(rec.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></td>
                                                <td style={{ fontWeight: "500", color: "#007bff" }}>{rec.batch_name}</td>
                                                <td>{getStatusBadge(rec.status)}</td>
                                                <td>
                                                    {rec.status === "Present" && <span style={{ color: "#2ecc71" }}><i className="fas fa-smile"></i> Excellent</span>}
                                                    {rec.status === "Late" && <span style={{ color: "#f39c12" }}><i className="fas fa-meh-blank"></i> Warned</span>}
                                                    {rec.status === "Absent" && <span style={{ color: "#e74c3c" }}><i className="fas fa-frown"></i> Action Required</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="no-record-box">
                                <i className="fas fa-clipboard-list"></i>
                                <h4>No Attendance Records Found</h4>
                                <p>You have no attendance records logged in the database yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- STAFF ATTENDANCE COMPONENT ---
const StaffAttendance = ({ user, handleLogout }) => {
    const [selectedBatch, setSelectedBatch] = useState("");
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState("");
    const [students, setStudents] = useState([]);
    const [batches, setBatches] = useState([]);

    const token = localStorage.getItem("token");

    const loadBatches = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/admin/batches");
            if (res.ok) {
                const data = await res.json();
                setBatches(data);
                if (data.length > 0 && !selectedBatch) {
                    setSelectedBatch(data[0].id.toString());
                }
            }
        } catch (e) { console.error(e); }
    };

    const loadStudents = async () => {
        if (!selectedBatch) return;
        try {
            const res = await fetch(`http://localhost:5000/api/attendance/students/${selectedBatch}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const list = await res.json();
                // Set default status to 'Present' for each student
                setStudents(list.map(s => ({ ...s, status: "Present" })));
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        loadBatches();
    }, []);

    useEffect(() => {
        loadStudents();
    }, [selectedBatch]);

    const handleStatusChange = (id, newStatus) => {
        setStudents(students.map(s => s.id === id ? { ...s, status: newStatus } : s));
    };

    const handleBulkAction = (newStatus) => {
        if(window.confirm(`Mark all visible students as ${newStatus}?`)) {
            const updatedStudents = students.map(s => {
                if(s.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                    return { ...s, status: newStatus };
                }
                return s;
            });
            setStudents(updatedStudents);
        }
    };

    const handleSave = async () => {
        if (!selectedBatch) return;
        try {
            const res = await fetch("http://localhost:5000/api/attendance/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    batchId: parseInt(selectedBatch),
                    date: selectedDate,
                    attendanceData: students.map(s => ({ studentId: s.id, status: s.status }))
                })
            });

            if (res.ok) {
                alert("Attendance records saved successfully!");
            } else {
                alert("Failed to submit attendance records.");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const presentCount = students.filter(s => s.status === "Present").length;
    const absentCount = students.filter(s => s.status === "Absent").length;
    const lateCount = students.filter(s => s.status === "Late").length;

    const getStatusBtnClass = (studentStatus, currentStatus) => {
        if (studentStatus !== currentStatus) return "portal-btn outline-secondary";
        if (currentStatus === "Present") return "portal-btn success";
        if (currentStatus === "Absent") return "portal-btn danger";
        if (currentStatus === "Late") return "portal-btn warning";
        return "portal-btn outline-secondary";
    };

    return (
        <div className="dashboard-layout">
            <Navbar role="staff" user={user} onLogout={handleLogout} />
            <div className="dashboard-main-container">
                <div className="page-container">
                    <div className="page-header">
                        <h2><i className="fas fa-tasks"></i> Mark Attendance</h2>
                        
                        <div className="header-actions">
                            <button className="portal-btn success" onClick={handleSave}>
                                <i className="fas fa-save"></i> Save Attendance
                            </button>
                        </div>
                    </div>

                    <div className="portal-card" style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                            <div className="portal-form-group">
                                <label>Batch / Class</label>
                                <select className="form-input" value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
                                    <option value="">Select Batch</option>
                                    {batches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.standard_name})</option>)}
                                </select>
                            </div>
                            <div className="portal-form-group">
                                <label>Date</label>
                                <input type="date" className="form-input" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="summary-grid" style={{ marginBottom: '20px' }}>
                        <div className="summary-card info">
                            <div className="summary-card-icon"><i className="fas fa-users"></i></div>
                            <div className="summary-card-details">
                                <h4>Total Students</h4>
                                <p>{students.length}</p>
                            </div>
                        </div>
                        <div className="summary-card success">
                            <div className="summary-card-icon"><i className="fas fa-check-circle"></i></div>
                            <div className="summary-card-details">
                                <h4>Present</h4>
                                <p>{presentCount}</p>
                            </div>
                        </div>
                        <div className="summary-card danger">
                            <div className="summary-card-icon"><i className="fas fa-times-circle"></i></div>
                            <div className="summary-card-details">
                                <h4>Absent</h4>
                                <p>{absentCount}</p>
                            </div>
                        </div>
                        <div className="summary-card warning">
                            <div className="summary-card-icon"><i className="fas fa-clock"></i></div>
                            <div className="summary-card-details">
                                <h4>Late</h4>
                                <p>{lateCount}</p>
                            </div>
                        </div>
                    </div>

                    <div className="portal-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                            <div className="search-bar" style={{ flex: 1, minWidth: '250px' }}>
                                <input 
                                    type="text" 
                                    placeholder="Search student name..." 
                                    className="form-input" 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ width: '100%', padding: '10px 15px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <span style={{ padding: '8px', color: '#4a5568', fontWeight: '500' }}>Bulk Actions:</span>
                                <button className="portal-btn outline-success" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => handleBulkAction("Present")}>Mark All Present</button>
                                <button className="portal-btn outline-danger" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => handleBulkAction("Absent")}>Mark All Absent</button>
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table className="portal-table">
                                <thead>
                                    <tr>
                                        <th>Student ID</th>
                                        <th>Student Name</th>
                                        <th>Current Status</th>
                                        <th style={{ textAlign: 'center' }}>Mark Attendance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.length > 0 ? (
                                        filteredStudents.map(student => (
                                            <tr key={student.id}>
                                                <td><strong>#{student.id}</strong></td>
                                                <td style={{ color: "#007bff", fontWeight: "500" }}>{student.name}</td>
                                                <td>
                                                    <span className={`portal-badge ${student.status === "Present" ? "success" : student.status === "Absent" ? "danger" : "warning"}`}>
                                                        {student.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button 
                                                            className={getStatusBtnClass(student.status, "Present")} 
                                                            style={{ padding: '6px 12px', fontSize: '13px' }}
                                                            onClick={() => handleStatusChange(student.id, "Present")}
                                                        >
                                                            Present
                                                        </button>
                                                        <button 
                                                            className={getStatusBtnClass(student.status, "Absent")} 
                                                            style={{ padding: '6px 12px', fontSize: '13px' }}
                                                            onClick={() => handleStatusChange(student.id, "Absent")}
                                                        >
                                                            Absent
                                                        </button>
                                                        <button 
                                                            className={getStatusBtnClass(student.status, "Late")} 
                                                            style={{ padding: '6px 12px', fontSize: '13px' }}
                                                            onClick={() => handleStatusChange(student.id, "Late")}
                                                        >
                                                            Late
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No students found matching your search.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const fallbackUser = {
    name: "User (Demo Mode)",
    role: "student",
    profileImg: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
};

// --- MAIN COMPONENT ---
const Attendance = () => {
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
        return <StaffAttendance user={user} handleLogout={handleLogout} />;
    }

    return <StudentAttendance user={user} handleLogout={handleLogout} />;
};

export default Attendance;
