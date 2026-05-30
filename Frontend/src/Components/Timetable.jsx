import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { getProfile, logoutUser } from "../Services/authService";
import "../Styles/dashboard.css";
import "../Styles/pages.css";

// --- STUDENT TIMETABLE COMPONENT ---
const StudentTimetable = ({ user, handleLogout }) => {
    const [selectedDay, setSelectedDay] = useState("All");
    const [lectures, setLectures] = useState([]);
    const token = localStorage.getItem("token");

    const fetchTimetable = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/timetable", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) setLectures(await res.json());
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchTimetable();
    }, []);

    const days = ["All", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const filteredLectures = lectures.filter(lec => {
        return selectedDay === "All" || lec.day === selectedDay;
    });

    return (
        <div className="dashboard-layout">
            <Navbar role="student" user={user} onLogout={handleLogout} />
            <div className="dashboard-main-container">
                <div className="page-container">
                    <div className="page-header">
                        <h2><i className="fas fa-calendar-alt"></i> Class Timetable</h2>
                        <div className="header-actions">
                            <div className="portal-form-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px" }}>
                                <label style={{ whiteSpace: "nowrap" }}>Filter Day:</label>
                                <select className="select-filter" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
                                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="portal-card">
                        {filteredLectures.length > 0 ? (
                            <div className="table-responsive">
                                <table className="portal-table">
                                    <thead>
                                        <tr>
                                            <th>Day</th>
                                            <th>Subject Name</th>
                                            <th>Faculty</th>
                                            <th>Lecture Time</th>
                                            <th>Room / Location</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLectures.map(lec => (
                                            <tr key={lec.id}>
                                                <td><strong>{lec.day}</strong></td>
                                                <td style={{ color: "var(--primary-color)", fontWeight: "500" }}>{lec.subject_name}</td>
                                                <td>{lec.teacher_name}</td>
                                                <td><i className="far fa-clock" style={{ marginRight: "6px", color: "#718096" }}></i>{lec.time_slot}</td>
                                                <td><span className="portal-badge info">{lec.room}</span></td>
                                                <td><span className="portal-badge success">Active</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="no-record-box">
                                <i className="fas fa-calendar-times"></i>
                                <h4>No Lectures Scheduled</h4>
                                <p>There are no lectures matching your selected day filter at this time.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- STAFF TIMETABLE COMPONENT ---
const StaffTimetable = ({ user, handleLogout, role }) => {
    const [selectedStandard, setSelectedStandard] = useState("All");
    const [selectedBatch, setSelectedBatch] = useState("All");
    const [selectedDay, setSelectedDay] = useState("All");
    const [showModal, setShowModal] = useState(false);
    const [schedules, setSchedules] = useState([]);
    const [standards, setStandards] = useState([]);
    const [batches, setBatches] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);

    const [formData, setFormData] = useState({
        standardId: "",
        batchId: "",
        day: "Monday",
        subjectId: "",
        teacherId: "",
        timeSlot: "",
        room: ""
    });

    const token = localStorage.getItem("token");

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

    const loadSchedules = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/timetable", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) setSchedules(await res.json());
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        loadStandards();
        loadBatches();
        loadSubjects();
        loadTeachers();
        loadSchedules();
    }, []);

    const days = ["All", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    const handleAdd = () => {
        setFormData({ standardId: "", batchId: "", day: "Monday", subjectId: "", teacherId: "", timeSlot: "", room: "" });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if(window.confirm("Are you sure you want to delete this schedule entry?")) {
            try {
                const res = await fetch(`http://localhost:5000/api/timetable/${id}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    setSchedules(schedules.filter(s => s.id !== id));
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch("http://localhost:5000/api/timetable", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    batchId: parseInt(formData.batchId),
                    day: formData.day,
                    subjectId: parseInt(formData.subjectId),
                    teacherId: parseInt(formData.teacherId),
                    timeSlot: formData.timeSlot,
                    room: formData.room
                })
            });

            if (res.ok) {
                loadSchedules();
                setShowModal(false);
            } else {
                alert("Error scheduling entry.");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const filteredSchedules = schedules.filter(s => {
        return (selectedStandard === "All" || s.standard_id === parseInt(selectedStandard)) &&
               (selectedBatch === "All" || s.batch_id === parseInt(selectedBatch)) &&
               (selectedDay === "All" || s.day === selectedDay);
    });

    const filterBatches = batches.filter((batch) => selectedStandard === "All" || batch.standard_id === parseInt(selectedStandard));
    const formBatches = batches.filter((batch) => !formData.standardId || batch.standard_id === parseInt(formData.standardId));
    const formSubjects = subjects.filter((subject) => !formData.standardId || subject.standard_id === parseInt(formData.standardId));

    return (
        <div className="dashboard-layout">
            <Navbar role={role} user={user} onLogout={handleLogout} />
            <div className="dashboard-main-container">
                <div className="page-container">
                    <div className="page-header">
                        <h2><i className="fas fa-calendar-alt"></i> Manage Timetable</h2>
                        <div className="header-actions">
                            <div className="portal-form-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px" }}>
                                <label style={{ whiteSpace: "nowrap" }}>Filter Class:</label>
                                <select className="select-filter" value={selectedStandard} onChange={(e) => {
                                    setSelectedStandard(e.target.value);
                                    setSelectedBatch("All");
                                }}>
                                    <option value="All">All Classes</option>
                                    {standards.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="portal-form-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px" }}>
                                <label style={{ whiteSpace: "nowrap" }}>Filter Batch:</label>
                                <select className="select-filter" value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
                                    <option value="All">All Batches</option>
                                    {filterBatches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.standard_name})</option>)}
                                </select>
                            </div>
                            <div className="portal-form-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px" }}>
                                <label style={{ whiteSpace: "nowrap" }}>Filter Day:</label>
                                <select className="select-filter" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
                                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <button className="portal-btn primary" onClick={handleAdd}>
                                <i className="fas fa-plus"></i> Add Schedule
                            </button>
                        </div>
                    </div>

                    <div className="portal-card">
                        {filteredSchedules.length > 0 ? (
                            <div className="table-responsive">
                                <table className="portal-table">
                                    <thead>
                                        <tr>
                                            <th>Class</th>
                                            <th>Batch</th>
                                            <th>Day</th>
                                            <th>Subject</th>
                                            <th>Faculty</th>
                                            <th>Time</th>
                                            <th>Room</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSchedules.map(s => (
                                            <tr key={s.id}>
                                                <td>{s.standard_name}</td>
                                                <td><span className="portal-badge" style={{backgroundColor: '#e2e8f0', color: '#4a5568'}}>{s.batch_name}</span></td>
                                                <td><strong>{s.day}</strong></td>
                                                <td style={{ color: "var(--primary-color)", fontWeight: "500" }}>{s.subject_name}</td>
                                                <td>{s.teacher_name}</td>
                                                <td><i className="far fa-clock" style={{ marginRight: "6px", color: "#718096" }}></i>{s.time_slot}</td>
                                                <td><span className="portal-badge info">{s.room}</span></td>
                                                <td>
                                                    <button className="portal-btn outline-danger" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleDelete(s.id)}>
                                                        <i className="fas fa-trash"></i> Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="no-record-box">
                                <i className="fas fa-calendar-times"></i>
                                <h4>No Schedules Found</h4>
                                <p>There are no schedules matching your current filters.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Simple Modal */}
            {showModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="modal-content" style={{
                        backgroundColor: '#fff', padding: '24px', borderRadius: '8px',
                        width: '100%', maxWidth: '500px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>Add New Schedule</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>&times;</button>
                        </div>
                        
                        <form onSubmit={handleSave}>
                            <div className="portal-form-group">
                                <label>Class / Standard</label>
                                <select className="form-input" value={formData.standardId} onChange={(e) => setFormData({...formData, standardId: e.target.value, batchId: "", subjectId: ""})} required>
                                    <option value="">Select Class</option>
                                    {standards.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            <div className="portal-form-group">
                                <label>Batch</label>
                                <select className="form-input" value={formData.batchId} onChange={(e) => setFormData({...formData, batchId: e.target.value})} required>
                                    <option value="">{formData.standardId ? "Select Batch" : "Select Class First"}</option>
                                    {formBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            
                            <div className="portal-form-group">
                                <label>Day</label>
                                <select className="form-input" value={formData.day} onChange={(e) => setFormData({...formData, day: e.target.value})} required>
                                    {days.filter(d => d !== "All").map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>

                            <div className="portal-form-group">
                                <label>Subject</label>
                                <select className="form-input" value={formData.subjectId} onChange={(e) => setFormData({...formData, subjectId: e.target.value})} required>
                                    <option value="">Select Subject</option>
                                    {formSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            <div className="portal-form-group">
                                <label>Faculty / Teacher</label>
                                <select className="form-input" value={formData.teacherId} onChange={(e) => setFormData({...formData, teacherId: e.target.value})} required>
                                    <option value="">Select Teacher</option>
                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="portal-form-group">
                                    <label>Time Slot</label>
                                    <input type="text" className="form-input" value={formData.timeSlot} onChange={(e) => setFormData({...formData, timeSlot: e.target.value})} required placeholder="e.g. 08:30 AM - 10:30 AM" />
                                </div>
                                <div className="portal-form-group">
                                    <label>Room Number</label>
                                    <input type="text" className="form-input" value={formData.room} onChange={(e) => setFormData({...formData, room: e.target.value})} required placeholder="e.g. L-102" />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                                <button type="button" className="portal-btn outline-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="portal-btn primary">Save Schedule</button>
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
const Timetable = () => {
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
        return <StaffTimetable user={user} handleLogout={handleLogout} role={role} />;
    }

    return <StudentTimetable user={user} handleLogout={handleLogout} />;
};

export default Timetable;
