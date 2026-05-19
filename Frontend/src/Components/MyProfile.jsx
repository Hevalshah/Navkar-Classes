import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { getProfile, logoutUser } from "../Services/authService";
import "../Styles/dashboard.css";
import "../Styles/pages.css";

const MyProfile = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const previewImgRef = useRef(null);
    const cropContainerRef = useRef(null);

    const [user, setUser] = useState(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Profile Photo Crop Modal State
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
    const [cropSrc, setCropSrc] = useState("");
    const [zoom, setZoom] = useState(1);
    const [xOffset, setXOffset] = useState(0);
    const [yOffset, setYOffset] = useState(0);
    const [rotation, setRotation] = useState(0);
    
    // Dragging & Pinching Touch States
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isPinching, setIsPinching] = useState(false);
    const [startPinchDist, setStartPinchDist] = useState(0);
    const [startPinchZoom, setStartPinchZoom] = useState(1);

    // Form inputs state (academic text details only)
    const [editName, setEditName] = useState("");
    const [editMobile, setEditMobile] = useState("");
    const [editParentName, setEditParentName] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editAddress, setEditAddress] = useState("");
    const [editBatch, setEditBatch] = useState("");

    const defaultMockUser = {
        id: "STU654321",
        name: "John Doe",
        email: "john.doe@navkar.com",
        mobile: "+91 98765 43210",
        parentName: "Richard Doe",
        profileImg: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
        role: "student",
        batch: "CA Foundation - Batch A",
        joiningDate: "10-May-2025",
        address: "123, Navkar Heights, Near Stadium Road, Ahmedabad, Gujarat - 380009",
        status: "Active"
    };

    // Load Profile details
    const loadProfile = async () => {
        const savedUserStr = localStorage.getItem("editedUser");
        if (savedUserStr) {
            try {
                const parsed = JSON.parse(savedUserStr);
                setUser(parsed);
                initForm(parsed);
                return;
            } catch (e) {
                console.error("Failed to parse saved user", e);
            }
        }

        const token = localStorage.getItem("token");
        if (!token) {
            setUser(defaultMockUser);
            initForm(defaultMockUser);
            return;
        }

        try {
            const apiUser = await getProfile(token);
            const mergedUser = {
                ...defaultMockUser,
                ...apiUser,
                id: apiUser.id ?? apiUser._id ?? defaultMockUser.id
            };
            setUser(mergedUser);
            initForm(mergedUser);
        } catch (error) {
            console.warn("Failed to load profile from API, falling back to mock user", error);
            setUser(defaultMockUser);
            initForm(defaultMockUser);
        }
    };

    useEffect(() => {
        loadProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const initForm = (u) => {
        setEditName(u.name || "");
        setEditMobile(u.mobile || "");
        setEditParentName(u.parentName || "");
        setEditEmail(u.email || "");
        setEditAddress(u.address || "");
        setEditBatch(u.batch || "");
    };

    const handleLogout = async () => {
        const token = localStorage.getItem("token");
        try {
            if (token) {
                await logoutUser(token);
            }
        } catch (error) {
            console.error("Failed to record logout", error);
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            localStorage.removeItem("editedUser");
            navigate("/");
        }
    };

    const handleEditOpen = () => {
        if (user) {
            initForm(user);
        }
        setIsEditOpen(true);
    };

    const handleOpenPhotoModal = () => {
        setCropSrc(user?.profileImg || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png");
        setZoom(1);
        setXOffset(0);
        setYOffset(0);
        setRotation(0);
        setIsPhotoModalOpen(true);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("File size exceeds 5MB limit. Please choose a smaller image.");
                return;
            }
            const reader = new FileReader();
            reader.onload = (uploadEvent) => {
                const base64Img = uploadEvent.target.result;
                setCropSrc(base64Img);
                setZoom(1);
                setXOffset(0);
                setYOffset(0);
                setRotation(0);
                setIsPhotoModalOpen(true);
            };
            reader.readAsDataURL(file);
        }
    };

    // Mouse Drag events
    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragStart({
            x: e.clientX - xOffset,
            y: e.clientY - yOffset
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setXOffset(e.clientX - dragStart.x);
        setYOffset(e.clientY - dragStart.y);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Touch Drag & Pinch-to-Zoom events for Mobile responsiveness
    const handleTouchStart = (e) => {
        if (e.touches.length === 1) {
            setIsDragging(true);
            setIsPinching(false);
            setDragStart({
                x: e.touches[0].clientX - xOffset,
                y: e.touches[0].clientY - yOffset
            });
        } else if (e.touches.length === 2) {
            setIsDragging(false);
            setIsPinching(true);
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const initialDist = Math.sqrt(dx * dx + dy * dy);
            setStartPinchDist(initialDist);
            setStartPinchZoom(zoom);
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches.length === 1 && isDragging) {
            setXOffset(e.touches[0].clientX - dragStart.x);
            setYOffset(e.touches[0].clientY - dragStart.y);
        } else if (e.touches.length === 2 && isPinching) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const currentDist = Math.sqrt(dx * dx + dy * dy);
            if (startPinchDist > 0) {
                const scale = currentDist / startPinchDist;
                const nextZoom = Math.min(Math.max(startPinchZoom * scale, 1.0), 4.0);
                setZoom(nextZoom);
            }
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        setIsPinching(false);
    };

    const handleRotate = () => {
        setRotation((prev) => (prev + 270) % 360); // 90 degrees counter-clockwise like WhatsApp
    };

    // Scroll Zoom Listener for Desktop
    useEffect(() => {
        const container = cropContainerRef.current;
        if (!container) return;

        const handleWheel = (e) => {
            e.preventDefault();
            setZoom((prev) => {
                const nextZoom = prev - e.deltaY * 0.0015;
                return Math.min(Math.max(nextZoom, 1.0), 4.0);
            });
        };

        container.addEventListener("wheel", handleWheel, { passive: false });
        return () => {
            container.removeEventListener("wheel", handleWheel);
        };
    }, [isPhotoModalOpen]);

    // Canvas crop operation (saves a physical perfectly-cropped file)
    const handleSaveCrop = () => {
        if (!previewImgRef.current) return;
        
        const img = previewImgRef.current;
        const canvas = document.createElement("canvas");
        const cropSize = 300; // Output resolution size
        canvas.width = cropSize;
        canvas.height = cropSize;
        const ctx = canvas.getContext("2d");

        // Rich black canvas background
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, cropSize, cropSize);

        // Translate to pivot center for standard rotations
        ctx.translate(150, 150);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom, zoom);

        // Aspect fit inside crop box
        const wRatio = cropSize / img.naturalWidth;
        const hRatio = cropSize / img.naturalHeight;
        const ratio = Math.min(wRatio, hRatio);
        const fitW = img.naturalWidth * ratio;
        const fitH = img.naturalHeight * ratio;

        // Apply screen translation offsets to unscaled pivot positions
        ctx.drawImage(img, -fitW / 2 + (xOffset / zoom), -fitH / 2 + (yOffset / zoom), fitW, fitH);
        
        // Export high quality cropped base64 jpeg
        const croppedBase64 = canvas.toDataURL("image/jpeg", 0.95);
        
        const updatedUser = {
            ...user,
            profileImg: croppedBase64
        };
        setUser(updatedUser);
        localStorage.setItem("editedUser", JSON.stringify(updatedUser));
        
        setIsPhotoModalOpen(false);
        alert("Profile picture cropped successfully!");
    };

    const handleDeletePhoto = () => {
        const confirmDelete = window.confirm("Are you sure you want to delete your profile picture?");
        if (confirmDelete) {
            const updatedUser = {
                ...user,
                profileImg: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
            };
            setUser(updatedUser);
            localStorage.setItem("editedUser", JSON.stringify(updatedUser));
            alert("Profile picture removed!");
            setIsPhotoModalOpen(false);
        }
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true);

        setTimeout(() => {
            setIsSaving(false);
            
            const updatedUser = {
                ...user,
                name: editName,
                mobile: editMobile,
                parentName: editParentName,
                email: editEmail,
                address: editAddress,
                batch: editBatch
            };

            setUser(updatedUser);
            localStorage.setItem("editedUser", JSON.stringify(updatedUser));
            setIsEditOpen(false);
            alert("Student profile details successfully updated!");
        }, 1200);
    };

    const studentId = user ? (user._id ?? user.id ?? "STU654321") : "STU654321";
    const sliceId = String(studentId).slice(-6).toUpperCase();

    return (
        <div className="dashboard-layout">
            <Navbar role="student" user={user} onLogout={handleLogout} />

            <div className="dashboard-main-container">
                <div className="page-container">
                    
                    {/* Header */}
                    <div className="page-header">
                        <h2><i className="fas fa-user-circle"></i> Student Profile Workspace</h2>
                        
                        <button onClick={handleEditOpen} className="portal-btn danger">
                            <i className="fas fa-user-edit"></i> Edit Profile Information
                        </button>
                    </div>

                    <div className="profile-page-grid">
                        
                        {/* Sidebar details card */}
                        <div className="profile-sidebar-card">
                            <div 
                                className="profile-image-container-interactive"
                                onClick={handleOpenPhotoModal}
                                title="Click to View or Crop Profile Picture"
                            >
                                <img 
                                    src={user?.profileImg || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} 
                                    alt={user?.name || "Student"} 
                                    className="profile-avatar-large"
                                />

                                <div className="profile-image-hover-overlay">
                                    <i className="fas fa-camera" style={{ fontSize: "20px" }}></i>
                                    <span>Edit Photo</span>
                                </div>
                            </div>
                            
                            <h3>{user?.name || "Loading..."}</h3>
                            <span className="batch-label">{user?.batch || "CA Foundation"}</span>
                            
                            <span className="portal-badge success" style={{ padding: "5px 12px", fontSize: "11px" }}>
                                {user?.status || "Active"} Student
                            </span>

                            <div style={{ marginTop: "20px", paddingTop: "15px", borderTop: "1px solid #e2e8f0", fontSize: "13px", color: "#718096", textAlign: "left" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                    <span>Joined:</span>
                                    <strong>{user?.joiningDate || "10-May-2025"}</strong>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>Portal Role:</span>
                                    <strong>STUDENT</strong>
                                </div>
                            </div>
                        </div>

                        {/* General details table sheet */}
                        <div className="portal-card blue-theme">
                            <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", textTransform: "uppercase", color: "#4a5568", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                                <i className="fas fa-file-invoice"></i> Official Academic & Personal Records
                            </h3>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "25px 35px" }}>
                                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                                    <span style={{ fontSize: "11px", color: "#a0aec0", textTransform: "uppercase", display: "block" }}>Full Name</span>
                                    <span style={{ fontSize: "15px", fontWeight: "600", color: "#2d3748" }}>{user?.name}</span>
                                </div>

                                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                                    <span style={{ fontSize: "11px", color: "#a0aec0", textTransform: "uppercase", display: "block" }}>Student Roll ID</span>
                                    <span style={{ fontSize: "15px", fontWeight: "bold", color: "#e74c3c" }}>{sliceId}</span>
                                </div>

                                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                                    <span style={{ fontSize: "11px", color: "#a0aec0", textTransform: "uppercase", display: "block" }}>Mobile Number</span>
                                    <span style={{ fontSize: "15px", fontWeight: "600", color: "#2d3748" }}>{user?.mobile}</span>
                                </div>

                                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                                    <span style={{ fontSize: "11px", color: "#a0aec0", textTransform: "uppercase", display: "block" }}>Parent / Guardian Name</span>
                                    <span style={{ fontSize: "15px", fontWeight: "600", color: "#2d3748" }}>{user?.parentName}</span>
                                </div>

                                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                                    <span style={{ fontSize: "11px", color: "#a0aec0", textTransform: "uppercase", display: "block" }}>Email Address</span>
                                    <span style={{ fontSize: "15px", fontWeight: "600", color: "#2d3748" }}>{user?.email}</span>
                                </div>

                                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                                    <span style={{ fontSize: "11px", color: "#a0aec0", textTransform: "uppercase", display: "block" }}>Course & Assigned Batch</span>
                                    <span style={{ fontSize: "15px", fontWeight: "600", color: "#2d3748" }}>{user?.batch}</span>
                                </div>

                                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "8px", gridColumn: "span 2" }}>
                                    <span style={{ fontSize: "11px", color: "#a0aec0", textTransform: "uppercase", display: "block" }}>Residential Address</span>
                                    <span style={{ fontSize: "14px", fontWeight: "500", color: "#4a5568", lineHeight: "1.4" }}>{user?.address}</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* EDIT STUDENT DETAILS MODAL */}
                    {isEditOpen && (
                        <div className="portal-modal-overlay">
                            <div className="portal-modal-container">
                                <div className="portal-modal-header">
                                    <h3>Edit Student Profile</h3>
                                    <button onClick={() => setIsEditOpen(false)} className="portal-modal-close">
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>

                                <form onSubmit={handleFormSubmit}>
                                    <div className="portal-modal-body">
                                        <div className="portal-form">
                                            <div className="portal-form-group">
                                                <label>Full Name:</label>
                                                <input 
                                                    type="text" 
                                                    className="portal-form-input" 
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    required 
                                                />
                                            </div>

                                            <div className="form-row">
                                                <div className="portal-form-group">
                                                    <label>Mobile Number:</label>
                                                    <input 
                                                        type="text" 
                                                        className="portal-form-input" 
                                                        value={editMobile}
                                                        onChange={(e) => setEditMobile(e.target.value)}
                                                        required 
                                                    />
                                                </div>

                                                <div className="portal-form-group">
                                                    <label>Parent/Guardian Name:</label>
                                                    <input 
                                                        type="text" 
                                                        className="portal-form-input" 
                                                        value={editParentName}
                                                        onChange={(e) => setEditParentName(e.target.value)}
                                                        required 
                                                    />
                                                </div>
                                            </div>

                                            <div className="portal-form-group">
                                                <label>Email Address:</label>
                                                <input 
                                                    type="email" 
                                                    className="portal-form-input" 
                                                    value={editEmail}
                                                    onChange={(e) => setEditEmail(e.target.value)}
                                                    required 
                                                />
                                            </div>

                                            <div className="portal-form-group">
                                                <label>Course / Batch:</label>
                                                <input 
                                                    type="text" 
                                                    className="portal-form-input" 
                                                    value={editBatch}
                                                    onChange={(e) => setEditBatch(e.target.value)}
                                                    required 
                                                />
                                            </div>

                                            <div className="portal-form-group">
                                                <label>Residential Address:</label>
                                                <textarea 
                                                    className="portal-form-textarea" 
                                                    value={editAddress}
                                                    onChange={(e) => setEditAddress(e.target.value)}
                                                    required 
                                                ></textarea>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="portal-modal-footer">
                                        <button 
                                            type="button" 
                                            onClick={() => setIsEditOpen(false)}
                                            className="portal-btn secondary"
                                            disabled={isSaving}
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="portal-btn danger"
                                            disabled={isSaving}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <i className="fas fa-spinner fa-spin"></i> Saving Changes...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-save"></i> Save Changes
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* WHATSAPP MOBILE STYLE FULLSCREEN PHOTO CROPPER MODAL */}
                    {isPhotoModalOpen && (
                        <div className="whatsapp-modal-overlay">
                            {/* Header */}
                            <div className="whatsapp-modal-header">
                                <button 
                                    onClick={() => fileInputRef.current?.click()} 
                                    className="whatsapp-header-btn"
                                    title="Choose a new file to upload"
                                >
                                    <i className="fas fa-sync-alt"></i> Change Photo
                                </button>
                                <span className="whatsapp-header-title">Move and Zoom</span>
                                <button 
                                    onClick={handleDeletePhoto} 
                                    className="whatsapp-header-btn text-danger"
                                    title="Remove profile picture"
                                >
                                    <i className="fas fa-trash-alt"></i> Remove
                                </button>
                            </div>

                            {/* WhatsApp Crop Workspace (captures desktop mouse / mobile touch dragging & pinching) */}
                            <div 
                                ref={cropContainerRef}
                                className="whatsapp-crop-workspace"
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                title="Drag to move, Scroll wheel to zoom, Touch pinch to zoom!"
                            >
                                <img 
                                    ref={previewImgRef}
                                    src={cropSrc || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} 
                                    alt="WhatsApp Crop Workspace"
                                    style={{
                                        position: "absolute",
                                        width: "300px",
                                        height: "300px",
                                        objectFit: "contain",
                                        transform: `translate(${xOffset}px, ${yOffset}px) rotate(${rotation}deg) scale(${zoom})`,
                                        transformOrigin: "center center",
                                        pointerEvents: "none",
                                        transition: isDragging || isPinching ? "none" : "transform 0.15s ease-out"
                                    }}
                                />

                                {/* Bounding Square Crop Box with White Mobile Corner Brackets */}
                                <div className="whatsapp-crop-box">
                                    <div className="whatsapp-crop-corner tl"></div>
                                    <div className="whatsapp-crop-corner tr"></div>
                                    <div className="whatsapp-crop-corner bl"></div>
                                    <div className="whatsapp-crop-corner br"></div>

                                    {/* Responsive 3x3 Grid Lines (Only highlighted when dragging or pinching) */}
                                    <div className={`whatsapp-grid-lines ${isDragging || isPinching ? "active" : ""}`}>
                                        <div className="whatsapp-grid-h1"></div>
                                        <div className="whatsapp-grid-h2"></div>
                                        <div className="whatsapp-grid-v1"></div>
                                        <div className="whatsapp-grid-v2"></div>
                                    </div>

                                    {/* Dashboard Circle Avatar cutout helper */}
                                    <div className="whatsapp-circle-mask"></div>
                                </div>
                            </div>

                            {/* WhatsApp Footer Navigation Actions */}
                            <div className="whatsapp-modal-footer">
                                <button 
                                    onClick={() => setIsPhotoModalOpen(false)} 
                                    className="whatsapp-footer-btn cancel"
                                >
                                    Cancel
                                </button>
                                
                                <button 
                                    onClick={handleRotate} 
                                    className="whatsapp-footer-btn rotate-icon"
                                    title="Rotate counter-clockwise 90°"
                                >
                                    <i className="fas fa-undo-alt"></i>
                                </button>
                                
                                <button 
                                    onClick={handleSaveCrop} 
                                    className="whatsapp-footer-btn done"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Hidden interactive file uploader input */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                style={{ display: "none" }} 
            />
        </div>
    );
};

export default MyProfile;
