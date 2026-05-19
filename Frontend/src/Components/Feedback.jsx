import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { getProfile, logoutUser } from "../Services/authService";
import "../Styles/dashboard.css";
import "../Styles/pages.css";

const Feedback = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form inputs
    const [category, setCategory] = useState("Faculty Feedback");
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [comments, setComments] = useState("");

    const fallbackUser = {
        name: "Student (Demo Mode)",
        role: "student",
        profileImg: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
    };

    // Simulated feedback list in local state
    const [feedbackLogs, setFeedbackLogs] = useState([
        { id: 1, date: "12-May-2026", category: "Faculty Feedback", rating: 5, comments: "Prof. R. C. Shah's Advanced Accounting lectures are exceptionally structured. The partnership revision was very helpful!" },
        { id: 2, date: "25-Apr-2026", category: "Campus Infrastructure", rating: 4, comments: "The computer labs are neat but the WiFi network speed inside Classroom B is occasionally slow." }
    ]);

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                setUser(fallbackUser);
                return;
            }
            try {
                const userData = await getProfile(token);
                setUser(userData);
            } catch (error) {
                console.warn("Failed to load profile from API, falling back to mock user", error);
                setUser(fallbackUser);
            }
        };
        fetchProfile();
    }, []);

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
            navigate("/");
        }
    };

    const handleFeedbackSubmit = (e) => {
        e.preventDefault();
        if (!comments.trim()) {
            alert("Please provide details or comments for your feedback.");
            return;
        }

        setIsSubmitting(true);

        setTimeout(() => {
            setIsSubmitting(false);

            const today = new Date();
            const formattedDate = `${String(today.getDate()).padStart(2, "0")}-${today.toLocaleString("default", { month: "short" })}-${today.getFullYear()}`;

            const newFeedback = {
                id: Date.now(),
                date: formattedDate,
                category,
                rating,
                comments
            };

            setFeedbackLogs([newFeedback, ...feedbackLogs]);
            setComments("");
            setRating(5);
            alert("Thank you for your valuable feedback! It has been successfully submitted to Navkar Quality Assurance Board.");
        }, 1200);
    };

    const renderStars = (count, hoverCount, activeRating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            const isActive = i <= (hoverCount || activeRating);
            stars.push(
                <span 
                    key={i}
                    className={`rating-star-btn ${isActive ? "active" : ""}`}
                    onClick={() => setRating(i)}
                    onMouseEnter={() => setHoverRating(i)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{ fontSize: "28px", cursor: "pointer" }}
                >
                    <i className={isActive ? "fas fa-star" : "far fa-star"}></i>
                </span>
            );
        }
        return stars;
    };

    return (
        <div className="dashboard-layout">
            <Navbar role="student" user={user} onLogout={handleLogout} />

            <div className="dashboard-main-container">
                <div className="page-container">
                    
                    {/* Header */}
                    <div className="page-header">
                        <h2><i className="fas fa-comments"></i> Student Feedback System</h2>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "30px", alignItems: "start" }}>
                        
                        {/* Feedback Submission form */}
                        <div className="portal-card">
                            <h3 style={{ margin: "0 0 15px 0", fontSize: "16px", textTransform: "uppercase", color: "#4a5568", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>Share Feedback</h3>
                            
                            <form onSubmit={handleFeedbackSubmit} className="portal-form">
                                <div className="portal-form-group">
                                    <label>Select Category:</label>
                                    <select 
                                        className="portal-form-input"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                    >
                                        <option value="Faculty Feedback">Faculty & Lecture Feedback</option>
                                        <option value="Course Study Material">Course Study Material Feedback</option>
                                        <option value="Campus Infrastructure">Campus & Infrastructure Feedback</option>
                                        <option value="Student Support Helpdesk">Student Support & Helpdesk Feedback</option>
                                    </select>
                                </div>

                                <div className="portal-form-group">
                                    <label>Rate Your Experience:</label>
                                    <div className="rating-stars-wrapper">
                                        {renderStars(5, hoverRating, rating)}
                                    </div>
                                    <span style={{ fontSize: "12px", color: "#718096", marginTop: "3px" }}>
                                        {rating === 5 && "Excellent - Completely Satisfied"}
                                        {rating === 4 && "Good - Mostly Satisfied"}
                                        {rating === 3 && "Average - Neutral"}
                                        {rating === 2 && "Poor - Dissatisfied"}
                                        {rating === 1 && "Extremely Poor - Action Required"}
                                    </span>
                                </div>

                                <div className="portal-form-group">
                                    <label>Provide Details / Comments:</label>
                                    <textarea 
                                        className="portal-form-textarea"
                                        placeholder="Please share specific details, suggestions, or comments to help us improve..."
                                        value={comments}
                                        onChange={(e) => setComments(e.target.value)}
                                        required
                                    ></textarea>
                                </div>

                                <button 
                                    type="submit" 
                                    className="portal-btn danger"
                                    disabled={isSubmitting}
                                    style={{ height: "42px" }}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin"></i> Submitting Feedback...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-check-circle"></i> Submit Feedback
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Feedback History log */}
                        <div className="portal-card blue-theme">
                            <h3 style={{ margin: "0 0 15px 0", fontSize: "16px", textTransform: "uppercase", color: "#4a5568", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>Previous Feedback Logs</h3>
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                                {feedbackLogs.length > 0 ? (
                                    feedbackLogs.map(log => (
                                        <div key={log.id} style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "15px" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                                <strong style={{ fontSize: "14px", color: "#007bff" }}>{log.category}</strong>
                                                <span style={{ fontSize: "11px", color: "#718096" }}>{log.date}</span>
                                            </div>
                                            
                                            {/* Stars display */}
                                            <div style={{ color: "#f1c40f", fontSize: "14px", marginBottom: "8px" }}>
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <i key={i} className={i < log.rating ? "fas fa-star" : "far fa-star"}></i>
                                                ))}
                                            </div>

                                            <p style={{ margin: "0", fontSize: "13px", color: "#4a5568", lineHeight: "1.5" }}>"{log.comments}"</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-record-box">
                                        <i className="fas fa-comment-slash"></i>
                                        <h4>No Feedback Logged</h4>
                                        <p>You have not logged any feedback yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Feedback;
