import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { getProfile, logoutUser } from "../Services/authService";
import "../Styles/dashboard.css";
import "../Styles/pages.css";

// --- PREVIEW MODAL COMPONENT ---
const FileViewerModal = ({ fileId, title, fileType, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const url = `http://localhost:5000/api/materials/view/${fileId}`;

    const isPreviewable = ["pdf", "png", "jpg", "jpeg", "gif", "txt"].includes(fileType.toLowerCase());

    return (
        <div className="portal-modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex',
            alignItems: 'center', justifyContent: 'center'
        }}>
            <div className="modal-content" style={{
                backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden',
                width: '90%', maxWidth: '900px', height: '85vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    <h3 style={{ margin: 0, color: '#2d3748' }}><i className="fas fa-file-alt"></i> Preview: {title}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#718096' }}>&times;</button>
                </div>
                <div style={{ flex: 1, position: 'relative', backgroundColor: '#edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {loading && isPreviewable && (
                        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#3182ce', marginBottom: '10px' }}></i>
                            <span>Loading Document Preview...</span>
                        </div>
                    )}
                    {error && (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                            <i className="fas fa-exclamation-triangle fa-3x" style={{ color: '#e53e3e', marginBottom: '15px' }}></i>
                            <h4>Unable to display preview</h4>
                            <p>This file format may not be supported for direct viewing, or the file was deleted. You can try downloading it directly.</p>
                            <a href={url} download className="portal-btn primary" style={{ display: 'inline-block', marginTop: '10px' }}>
                                <i className="fas fa-download"></i> Download File
                            </a>
                        </div>
                    )}
                    {!error && isPreviewable ? (
                        <iframe 
                            src={url}
                            title={title}
                            width="100%" 
                            height="100%" 
                            style={{ border: 'none' }}
                            onLoad={() => setLoading(false)}
                            onError={() => { setError(true); setLoading(false); }}
                        ></iframe>
                    ) : (
                        !isPreviewable && (
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                <i className="fas fa-arrow-alt-circle-down fa-3x" style={{ color: '#4a5568', marginBottom: '15px' }}></i>
                                <h4>Download Required</h4>
                                <p>Files of type <strong>.{fileType}</strong> (e.g. Word, Excel, PowerPoint) cannot be previewed directly in the browser.</p>
                                <a href={url} download className="portal-btn primary" style={{ display: 'inline-block', marginTop: '15px' }}>
                                    <i className="fas fa-download"></i> Download {fileType.toUpperCase()}
                                </a>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

// --- STUDENT MATERIALS COMPONENT ---
const StudentMaterials = ({ user, handleLogout }) => {
    const [selectedSubject, setSelectedSubject] = useState("All");
    const [materials, setMaterials] = useState([]);
    const [subjectsList, setSubjectsList] = useState([]);
    const [previewFile, setPreviewFile] = useState(null);

    const token = localStorage.getItem("token");

    // Fetch student materials
    const fetchMaterials = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/materials", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) setMaterials(await res.json());
        } catch (e) { console.error(e); }
    };

    // Fetch subjects list
    const fetchSubjects = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/admin/subjects");
            if (res.ok) {
                const data = await res.json();
                if (user && user.standardId) {
                    setSubjectsList(data.filter(s => s.standard_id === user.standardId));
                } else {
                    setSubjectsList(data);
                }
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchMaterials();
        fetchSubjects();
    }, [user]);

    const filteredMaterials = materials.filter(item => {
        return selectedSubject === "All" || item.subject_id === parseInt(selectedSubject);
    });

    const getFileIcon = (type) => {
        switch (type?.toLowerCase()) {
            case "pdf": return <i className="fas fa-file-pdf"></i>;
            case "xls": 
            case "xlsx": return <i className="fas fa-file-excel"></i>;
            case "ppt": 
            case "pptx": return <i className="fas fa-file-powerpoint"></i>;
            case "png":
            case "jpg":
            case "jpeg": return <i className="fas fa-file-image"></i>;
            default: return <i className="fas fa-file-alt"></i>;
        }
    };

    const getIconClass = (type) => {
        switch (type?.toLowerCase()) {
            case "pdf": return "material-icon-box";
            case "xls":
            case "xlsx": return "material-icon-box xls";
            case "ppt":
            case "pptx": return "material-icon-box ppt";
            case "png":
            case "jpg":
            case "jpeg": return "material-icon-box doc";
            default: return "material-icon-box doc";
        }
    };

    return (
        <div className="dashboard-layout">
            <Navbar role="student" user={user} onLogout={handleLogout} />
            <div className="dashboard-main-container">
                <div className="page-container">
                    <div className="page-header">
                        <h2><i className="fas fa-book"></i> Study Materials & Notes</h2>
                        <div className="header-actions">
                            <div className="portal-form-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px" }}>
                                <label style={{ whiteSpace: "nowrap" }}>Select Subject:</label>
                                <select className="select-filter" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                                    <option value="All">All Subjects</option>
                                    {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="portal-card" style={{ padding: "10px 20px", marginBottom: "20px", display: "flex", gap: "10px", flexWrap: "wrap", borderTop: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                        <button
                            onClick={() => setSelectedSubject("All")}
                            className={`portal-btn ${selectedSubject === "All" ? "danger sm" : "outline sm"}`}
                            style={{ borderRadius: "20px", textTransform: "uppercase", fontSize: "11px", fontWeight: "bold" }}
                        >
                            All Subjects
                        </button>
                        {subjectsList.map(subj => (
                            <button
                                key={subj.id}
                                onClick={() => setSelectedSubject(subj.id.toString())}
                                className={`portal-btn ${selectedSubject === subj.id.toString() ? "danger sm" : "outline sm"}`}
                                style={{ borderRadius: "20px", textTransform: "uppercase", fontSize: "11px", fontWeight: "bold" }}
                            >
                                {subj.name}
                            </button>
                        ))}
                    </div>

                    {filteredMaterials.length > 0 ? (
                        <div className="materials-grid">
                            {filteredMaterials.map(mat => (
                                <div key={mat.id} className="material-item-card">
                                    <div>
                                        <div className="material-icon-header">
                                            <div className={getIconClass(mat.file_type)}>{getFileIcon(mat.file_type)}</div>
                                            <div className="material-meta">
                                                <h3>{mat.title}</h3>
                                                <span>Subject: <strong>{mat.subject_name}</strong></span>
                                            </div>
                                        </div>
                                        <p className="material-details">{mat.description || "No description provided."}</p>
                                    </div>
                                    <div>
                                        <button 
                                            onClick={() => setPreviewFile(mat)}
                                            className="portal-btn primary sm"
                                            style={{ width: "100%", justifyContent: "center" }}
                                        >
                                            <i className="fas fa-eye"></i> View / Preview ({mat.file_size})
                                        </button>
                                        <div className="material-footer">
                                            <span>Uploaded: {new Date(mat.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                            <span className="portal-badge success" style={{ fontSize: "9px" }}>FREE</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="portal-card">
                            <div className="no-record-box">
                                <i className="fas fa-folder-open"></i>
                                <h4>No Materials Found</h4>
                                <p>There are no notes uploaded for the selected subject at this time.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Viewer Modal */}
            {previewFile && (
                <FileViewerModal 
                    fileId={previewFile.id}
                    title={previewFile.title}
                    fileType={previewFile.file_type}
                    onClose={() => setPreviewFile(null)}
                />
            )}
        </div>
    );
};

// --- STAFF MATERIALS COMPONENT ---
const StaffMaterials = ({ user, handleLogout, role }) => {
    const [materials, setMaterials] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [batches, setBatches] = useState([]);

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [fileToUpload, setFileToUpload] = useState(null);
    const [previewFile, setPreviewFile] = useState(null);

    const [formData, setFormData] = useState({
        id: null,
        title: "",
        subjectId: "",
        batchId: "",
        desc: "",
        file_type: "",
        file_size: ""
    });

    const token = localStorage.getItem("token");

    // Fetch lists
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

    const loadMaterials = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/materials", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) setMaterials(await res.json());
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        loadSubjects();
        loadBatches();
        loadMaterials();
    }, []);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFile = (file) => {
        let type = "doc";
        if(file.name.endsWith(".pdf")) type = "pdf";
        else if(file.name.endsWith(".xls") || file.name.endsWith(".xlsx")) type = "xls";
        else if(file.name.endsWith(".ppt") || file.name.endsWith(".pptx")) type = "ppt";
        else if(file.name.endsWith(".png") || file.name.endsWith(".jpg") || file.name.endsWith(".jpeg")) type = "png";

        setFileToUpload(file);
        setFormData({
            ...formData,
            title: formData.title || file.name.split('.')[0],
            file_type: type,
            file_size: (file.size / (1024*1024)).toFixed(1) + " MB"
        });
    };

    const handleDelete = async (id) => {
        if(window.confirm("Are you sure you want to delete this material?")) {
            try {
                const res = await fetch(`http://localhost:5000/api/materials/${id}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    setMaterials(materials.filter(m => m.id !== id));
                } else {
                    alert("Failed to delete study material.");
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleEdit = (mat) => {
        setFormData({
            id: mat.id,
            title: mat.title,
            subjectId: mat.subject_id,
            batchId: mat.batch_id,
            desc: mat.description || "",
            file_type: mat.file_type,
            file_size: mat.file_size
        });
        setFileToUpload(null);
        setShowUploadModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if(!formData.title || !formData.subjectId || !formData.batchId) return;

        try {
            if (formData.id) {
                // UPDATE (UI details modification only, no file upload update required by specifications)
                const res = await fetch(`http://localhost:5000/api/materials/${formData.id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        title: formData.title,
                        description: formData.desc,
                        subjectId: parseInt(formData.subjectId),
                        batchId: parseInt(formData.batchId)
                    })
                });

                if (res.ok) {
                    loadMaterials();
                } else {
                    alert("Error updating details.");
                }
            } else {
                // CREATE (Form data upload)
                if (!fileToUpload) {
                    alert("Please select a file to upload first!");
                    return;
                }
                const body = new FormData();
                body.append("file", fileToUpload);
                body.append("title", formData.title);
                body.append("description", formData.desc);
                body.append("subjectId", formData.subjectId);
                body.append("batchId", formData.batchId);

                const res = await fetch("http://localhost:5000/api/materials", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}` },
                    body
                });

                if (res.ok) {
                    loadMaterials();
                } else {
                    const err = await res.json();
                    alert(err.message || "Failed to upload file.");
                }
            }
            setShowUploadModal(false);
            setFileToUpload(null);
        } catch (err) {
            console.error(err);
            alert("Network error occurred.");
        }
    };

    const getFileIcon = (type) => {
        switch (type?.toLowerCase()) {
            case "pdf": return <i className="fas fa-file-pdf" style={{color: 'var(--accent-color)'}}></i>;
            case "xls":
            case "xlsx": return <i className="fas fa-file-excel" style={{color: '#2ecc71'}}></i>;
            case "ppt":
            case "pptx": return <i className="fas fa-file-powerpoint" style={{color: '#e67e22'}}></i>;
            case "png":
            case "jpg":
            case "jpeg": return <i className="fas fa-file-image" style={{color: '#3498db'}}></i>;
            default: return <i className="fas fa-file-alt" style={{color: '#718096'}}></i>;
        }
    };

    return (
        <div className="dashboard-layout">
            <Navbar role={role} user={user} onLogout={handleLogout} />
            <div className="dashboard-main-container">
                <div className="page-container">
                    <div className="page-header">
                        <h2><i className="fas fa-upload"></i> Manage Study Materials</h2>
                        <div className="header-actions">
                            <button className="portal-btn primary" onClick={() => {
                                setFormData({ id: null, title: "", subjectId: "", batchId: "", desc: "", file_type: "", file_size: "" });
                                setFileToUpload(null);
                                setShowUploadModal(true);
                            }}>
                                <i className="fas fa-cloud-upload-alt"></i> Upload Material
                            </button>
                        </div>
                    </div>

                    <div className="portal-card">
                        {materials.length > 0 ? (
                            <div className="table-responsive">
                                <table className="portal-table">
                                    <thead>
                                        <tr>
                                            <th>Type</th>
                                            <th>Title & Description</th>
                                            <th>Subject</th>
                                            <th>Batch</th>
                                            <th>Upload Date</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {materials.map(mat => (
                                            <tr key={mat.id}>
                                                <td style={{ fontSize: '24px', textAlign: 'center' }}>
                                                    {getFileIcon(mat.file_type)}
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: '600', color: '#2d3748', marginBottom: '4px' }}>{mat.title}</div>
                                                    <div style={{ fontSize: '12px', color: '#718096' }}>{mat.description?.substring(0, 70)}... ({mat.file_size})</div>
                                                </td>
                                                <td><span className="portal-badge outline-primary">{mat.subject_name}</span></td>
                                                <td><span className="portal-badge" style={{backgroundColor: '#edf2f7', color: '#4a5568'}}>{mat.batch_name}</span></td>
                                                <td>{new Date(mat.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button className="portal-btn outline-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => setPreviewFile(mat)} title="View">
                                                            <i className="fas fa-eye"></i> View
                                                        </button>
                                                        <button className="portal-btn outline-primary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleEdit(mat)} title="Edit">
                                                            <i className="fas fa-edit"></i> Edit
                                                        </button>
                                                        <button className="portal-btn outline-danger" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleDelete(mat.id)} title="Delete">
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
                                <i className="fas fa-folder-open"></i>
                                <h4>No Materials Uploaded</h4>
                                <p>Click the 'Upload Material' button to add study resources.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="modal-content" style={{
                        backgroundColor: '#fff', padding: '24px', borderRadius: '8px',
                        width: '100%', maxWidth: '600px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>{formData.id ? 'Edit Material Details' : 'Upload New Material'}</h3>
                            <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>&times;</button>
                        </div>
                        
                        <form onSubmit={handleSave}>
                            {!formData.id && (
                                <div 
                                    className="upload-dropzone" 
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    style={{
                                        border: `2px dashed ${dragActive ? 'var(--primary-color)' : '#cbd5e0'}`,
                                        borderRadius: '8px',
                                        padding: '30px',
                                        textAlign: 'center',
                                        backgroundColor: dragActive ? '#ebf8ff' : '#f8fafc',
                                        marginBottom: '20px',
                                        transition: 'all 0.2s ease',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <i className="fas fa-cloud-upload-alt" style={{ fontSize: '32px', color: '#a0aec0', marginBottom: '10px' }}></i>
                                    <p style={{ margin: '0 0 10px 0', fontWeight: '500', color: '#4a5568' }}>Drag and drop file here or click to browse</p>
                                    <input 
                                        type="file" 
                                        id="file-upload" 
                                        style={{ display: 'none' }} 
                                        onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                                    />
                                    <label htmlFor="file-upload" className="portal-btn outline-primary sm" style={{ cursor: 'pointer', display: 'inline-block' }}>
                                        Select File
                                    </label>
                                    {formData.title && (
                                        <div style={{ marginTop: '10px', fontSize: '13px', color: '#38a169', fontWeight: '500' }}>
                                            <i className="fas fa-check-circle"></i> File selected: {formData.title}.{formData.file_type} ({formData.file_size})
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="portal-form-group">
                                <label>Material Title</label>
                                <input type="text" className="form-input" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required placeholder="e.g. Chapter 1 Notes" />
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

                            <div className="portal-form-group">
                                <label>Description (Optional)</label>
                                <textarea className="form-input" rows="3" value={formData.desc} onChange={(e) => setFormData({...formData, desc: e.target.value})} placeholder="Provide some details about this material..."></textarea>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                                <button type="button" className="portal-btn outline-secondary" onClick={() => setShowUploadModal(false)}>Cancel</button>
                                <button type="submit" className="portal-btn primary">
                                    {formData.id ? 'Save Changes' : 'Upload File'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Viewer Modal */}
            {previewFile && (
                <FileViewerModal 
                    fileId={previewFile.id}
                    title={previewFile.title}
                    fileType={previewFile.file_type}
                    onClose={() => setPreviewFile(null)}
                />
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
const Materials = () => {
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
        return <StaffMaterials user={user} handleLogout={handleLogout} role={role} />;
    }

    return <StudentMaterials user={user} handleLogout={handleLogout} />;
};

export default Materials;
