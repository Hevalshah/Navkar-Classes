import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/navkar-logo.png";
import classroom from "../assets/classroom.jpg";
import saurabh from "../assets/saurabh.jpeg";
import kaksha from "../assets/kaksha.jpeg";
import nancy from "../assets/nancy.jpeg";
import "../Styles/landing.css";

const Landing = () => {
    const navigate = useNavigate();
    const [cName, setCName] = useState("");
    const [cEmail, setCEmail] = useState("");
    const [cMsg, setCMsg] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [toastMsg, setToastMsg] = useState("");
    const messageTextareaRef = useRef(null);

    const handleLoginRedirect = () => {
        navigate("/login");
    };

    useEffect(() => {
        if (!messageTextareaRef.current) return;
        messageTextareaRef.current.style.height = "auto";
        messageTextareaRef.current.style.height = `${messageTextareaRef.current.scrollHeight}px`;
    }, [cMsg]);

    const handleContactSubmit = async (e) => {
        e.preventDefault();
        setIsSending(true);
        setToastMsg("");
        try {
            const res = await fetch("http://localhost:5000/api/contact", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: cName,
                    email: cEmail,
                    message: cMsg
                })
            });

            if (res.ok) {
                setToastMsg("Your message has been sent successfully.");
                setCName("");
                setCEmail("");
                setCMsg("");
                setTimeout(() => setToastMsg(""), 5000);
            } else {
                const errData = await res.json();
                alert(errData.message || "Unable to send your message. Please try again.");
            }
        } catch (err) {
            console.error(err);
            alert("Unable to connect. Please try again.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="landing-body">
            {/* Header / Navbar */}
            <nav className="landing-nav">
                <div className="landing-logo">
                    <img src={logo} alt="Navkar Classes logo" />
                    <span>Navkar Classes</span>
                </div>
                <ul className="landing-links">
                    <li><a href="#about">About</a></li>
                    <li><a href="#courses">Programs</a></li>
                    <li><a href="#faculty">Faculty</a></li>
                    <li><a href="#testimonials">Testimonials</a></li>
                    <li><a href="#contact">Contact</a></li>
                </ul>
                <button onClick={handleLoginRedirect} className="landing-nav-btn">
                    <i className="fas fa-sign-in-alt"></i> Log in
                </button>
            </nav>

            {/* Hero Section */}
            <header className="landing-hero">
                <div className="landing-hero-content">
                    <span className="landing-hero-tag">Trusted Coaching Institute</span>
                    <h1>Empowering Dreams, Shaping <span>Careers</span></h1>
                    <p>
                        Welcome to Navkar Classes, a trusted coaching institute for Standards 5 to 10 and 11th and 12th Commerce. Learn with expert faculty, access quality study materials, and take charge of your academic journey.
                    </p>
                    <div className="landing-hero-actions">
                        <button onClick={handleLoginRedirect} className="landing-btn-primary">
                            Get started
                        </button>
                        <a href="#courses" className="landing-btn-secondary" style={{ textAlign: "center", textDecoration: "none" }}>
                            Explore programs
                        </a>
                    </div>
                </div>
                <div className="landing-hero-image">
                    <img src={classroom} alt="Navkar Classes classroom" />
                </div>
            </header>

            {/* About Section */}
            <section id="about" className="landing-section">
                <div className="about-grid">
                    <div className="about-img">
                        <img src={"https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1470&auto=format&fit=crop"} alt="Students studying" />
                    </div>
                    <div className="about-info">
                        <h3>Why Choose Navkar Classes?</h3>
                        <p>
                            Founded to provide high-quality academic guidance, Navkar Classes has consistently helped students achieve strong results in Standards 5 to 10 and 11th and 12th Commerce. We focus on conceptual clarity, regular evaluation, and personalized feedback.
                        </p>
                        <p>
                            Our digital student portal helps students track their Timetable, view exam submissions, access learning materials, check attendance, and review progress reports with ease.
                        </p>
                        <div className="about-stats">
                            <div className="stat-card">
                                <h4>13+</h4>
                                <p>Years of Experience</p>
                            </div>
                            <div className="stat-card">
                                <h4>1,000+</h4>
                                <p>Students Mentored</p>
                            </div>
                            <div className="stat-card">
                                <h4>95%</h4>
                                <p>Success Rate</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Courses Section */}
            <section id="courses" className="landing-section alt-bg">
                <div className="landing-section-header">
                    <h2>Our Coaching Programs</h2>
                    <p>Build confidence with focused batches led by experienced subject educators.</p>
                </div>
                <div className="courses-grid">
                    <div className="course-card">
                        <div className="course-card-body">
                            <div className="course-icon-box">
                                <i className="fas fa-book-reader"></i>
                            </div>
                            <h3>Standards 5 to 10</h3>
                            <p>Strengthen core concepts in Mathematics, Science, English, and Social Studies with comprehensive school-level coaching.</p>
                            <ul className="course-features">
                                <li><i className="fas fa-check-circle"></i> Daily homework sheets</li>
                                <li><i className="fas fa-check-circle"></i> Chapter-wise tests</li>
                                <li><i className="fas fa-check-circle"></i> Interactive doubt sessions</li>
                             </ul>
                        </div>
                    </div>

                    <div className="course-card">
                        <div className="course-card-body">
                            <div className="course-icon-box">
                                <i className="fas fa-balance-scale"></i>
                            </div>
                            <h3>11th and 12th Commerce</h3>
                            <p>Build a strong command of Accountancy, Business Studies, Economics, and Statistics with experienced Commerce faculty.</p>
                            <ul className="course-features">
                                <li><i className="fas fa-check-circle"></i> Board exam preparation series</li>
                                <li><i className="fas fa-check-circle"></i> Formula sheets and key notes</li>
                                <li><i className="fas fa-check-circle"></i> Detailed assignment reviews</li>
                            </ul>
                        </div>
                    </div>

                    <div className="course-card">
                        <div className="course-card-body">
                            <div className="course-icon-box">
                                <i className="fas fa-graduation-cap"></i>
                            </div>
                            <h3>Mock Board Papers</h3>
                            <p>Prepare for board exams with full-length papers, time-management strategies, and detailed answer sheet reviews.</p>
                            <ul className="course-features">
                                <li><i className="fas fa-check-circle"></i> Current paper pattern</li>
                                <li><i className="fas fa-check-circle"></i> Performance analysis</li>
                                <li><i className="fas fa-check-circle"></i> Structured Timetables</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Faculty Section */}
            <section id="faculty" className="landing-section">
                <div className="landing-section-header">
                    <h2>Meet Our Faculty</h2>
                    <p>Learn from dedicated educators committed to your academic success.</p>
                </div>
                <div className="faculty-grid">
                    <div className="faculty-card">
                        <div className="faculty-img-wrapper">
                            <img
                                src={saurabh}
                                alt="Saurabh Shah"
                                style={{ "--faculty-focus-y": "10%" }}
                            />
                        </div>
                        <h3>Saurabh Shah</h3>
                        <span>B.Com</span>
                        <p>Renowned educator who mentors students in Commerce concepts and Social Studies.</p>
                    </div>
                    <div className="faculty-card">
                        <div className="faculty-img-wrapper">
                            <img
                                src={kaksha}
                                alt="Kaksha Shah"
                                style={{ "--faculty-focus-y": "27%" }}
                            />
                        </div>
                        <h3>Kaksha Shah</h3>
                        <span>B.Sc</span>
                        <p>Over 15 years of experience teaching Mathematics and Science.</p>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section id="testimonials" className="landing-section alt-bg">
                <div className="landing-section-header">
                    <h2>What Our Students Say</h2>
                    <p>Real feedback from students who transformed their learning experience at Navkar Classes.</p>
                </div>
                <div className="testimonials-grid">
                    <div className="testimonial-card">
                        <i className="fas fa-quote-right quote-icon"></i>
                        <p className="testimonial-text">
                            "The mock board exam series, paper sets, weekly tests, and detailed evaluation reports helped me identify my weak areas. I cleared my Standard 10 board exam with a great result."
                        </p>
                        <div className="testimonial-user">
                            <div className="testimonial-avatar">
                                <img
                                src={nancy}
                                alt="Nancy"
                                style={{ "--faculty-focus-y": "27%" }}
                            />
                            </div>
                            <div className="testimonial-info">
                                <h4>Nancy</h4>
                                <p>Standard 10 Achiever</p>
                            </div>
                        </div>
                    </div>

                    <div className="testimonial-card">
                        <i className="fas fa-quote-right quote-icon"></i>
                        <p className="testimonial-text">
                            "Navkar's study material was highly structured. The online portal made checking timetables and downloading handouts extremely convenient."
                        </p>
                        <div className="testimonial-user">
                            <div className="testimonial-avatar">
                                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=128&auto=format&fit=crop" alt="Student avatar" />
                            </div>
                            <div className="testimonial-info">
                                <h4>Amit Shah</h4>
                                <p>12th Commerce Student</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="landing-section">
                <div className="landing-section-header">
                    <h2>Get in Touch</h2>
                    <p>Have a question? Reach out to us, and our academic counselors will get back to you shortly.</p>
                </div>
                <div className="contact-container">
                    <div className="contact-info-section">
                        <h3>Navkar Classes Office</h3>
                        <p>We are located in GIDC Colony, Vadodara. Feel free to call us or visit our office.</p>
                        <div className="contact-methods">
                            <div className="contact-method-item">
                                <div className="contact-method-icon">
                                    <i className="fas fa-map-marker-alt"></i>
                                </div>
                                <div className="contact-method-text">
                                    <h4>Our Address</h4>
                                    <p>B-1/10, GIDC Colony, Opp. ESI Hospital, Near Vegetable Market, Manjalpur Road, Vadodara, Gujarat - 390011</p>
                                </div>
                            </div>

                            <div className="contact-method-item">
                                <div className="contact-method-icon">
                                    <i className="fas fa-phone-alt"></i>
                                </div>
                                <div className="contact-method-text">
                                    <h4>Phone Number</h4>
                                    <p>+91 8735810902 / +91 8000222004</p>
                                </div>
                            </div>

                            <div className="contact-method-item">
                                <div className="contact-method-icon">
                                    <i className="fas fa-envelope"></i>
                                </div>
                                <div className="contact-method-text">
                                    <h4>Email Address</h4>
                                    <p>info@navkarclasses.com</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="contact-form-section">
                        {toastMsg && (
                            <div style={{ backgroundColor: "#d4edda", color: "#155724", padding: "12px", borderRadius: "8px", marginBottom: "15px", border: "1px solid #c3e6cb", textAlign: "center", fontSize: "14px", fontWeight: "600" }}>
                                {toastMsg}
                            </div>
                        )}
                        <form onSubmit={handleContactSubmit}>
                            <div className="contact-form-group">
                                <label htmlFor="c-name">Full Name</label>
                                <input type="text" id="c-name" className="contact-input" placeholder="Enter your name" value={cName} onChange={(e) => setCName(e.target.value)} required />
                            </div>
                            <div className="contact-form-group">
                                <label htmlFor="c-email">Email Address</label>
                                <input type="email" id="c-email" className="contact-input" placeholder="Enter your email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} required />
                            </div>
                            <div className="contact-form-group">
                                <label htmlFor="c-msg">Message or Query</label>
                                <textarea id="c-msg" className="contact-textarea" placeholder="How can we help you?" value={cMsg} onChange={(e) => setCMsg(e.target.value)} ref={messageTextareaRef} required></textarea>
                            </div>
                            <button type="submit" className="landing-btn-primary" style={{ width: "100%" }} disabled={isSending}>
                                {isSending ? "Sending..." : "Send message"}
                            </button>
                        </form>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <p>&copy; {new Date().getFullYear()} Navkar Classes. All rights reserved. Built for student excellence.</p>
            </footer>
        </div>
    );
};

export default Landing;
