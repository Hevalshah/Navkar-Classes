import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/navkar-logo.png";
import classroom from "../assets/classroom.jpg";
import saurabh from "../assets/saurabh.jpeg";
import kaksha from "../assets/kaksha.jpeg";
import "../Styles/landing.css";

const Landing = () => {
    const navigate = useNavigate();

    const handleLoginRedirect = () => {
        navigate("/login");
    };

    return (
        <div className="landing-body">
            {/* Header / Navbar */}
            <nav className="landing-nav">
                <div className="landing-logo">
                    <img src={logo} alt="Navkar Classes Logo" />
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
                    <i className="fas fa-sign-in-alt"></i> Login
                </button>
            </nav>

            {/* Hero Section */}
            <header className="landing-hero">
                <div className="landing-hero-content">
                    <span className="landing-hero-tag">Best Coaching Institute</span>
                    <h1>Empowering Dreams, Shaping <span>Careers</span></h1>
                    <p>
                        Welcome to Navkar Classes, the premier coaching institute for Standard 5 to 10 and 11th & 12th Commerce. Connect with expert faculty, access quality study materials, and take control of your academic journey.
                    </p>
                    <div className="landing-hero-actions">
                        <button onClick={handleLoginRedirect} className="landing-btn-primary">
                            Get Started
                        </button>
                        <a href="#courses" className="landing-btn-secondary" style={{ textAlign: "center", textDecoration: "none" }}>
                            Explore Programs
                        </a>
                    </div>
                </div>
                <div className="landing-hero-image">
                    <img src={classroom} alt="Navkar Classes Classroom" />
                </div>
            </header>

            {/* About Section */}
            <section id="about" className="landing-section">
                <div className="about-grid">
                    <div className="about-img">
                        <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1470&auto=format&fit=crop" alt="Students studying" />
                    </div>
                    <div className="about-info">
                        <h3>Why Choose Navkar Classes?</h3>
                        <p>
                            Established with the vision of providing top-notch academic guidance, Navkar Classes has consistently produced high-ranking achievers in School Boards (Std 5-10) and Commerce Streams (11th & 12th). We focus on conceptual clarity, rigorous evaluation, and individual feedback.
                        </p>
                        <p>
                            Our digital student portal enables students to seamlessly track their timetable, view exam submissions, access learning materials, check attendance registers, and view progress reports.
                        </p>
                        <div className="about-stats">
                            <div className="stat-card">
                                <h4>13+</h4>
                                <p>Years Experience</p>
                            </div>
                            <div className="stat-card">
                                <h4>1k+</h4>
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
                    <p>Accelerate your academic path with customized batches taught by veteran subject educators.</p>
                </div>
                <div className="courses-grid">
                    <div className="course-card">
                        <div className="course-card-body">
                            <div className="course-icon-box">
                                <i className="fas fa-book-reader"></i>
                            </div>
                            <h3>Standard 5 to 10</h3>
                            <p>Master the basics of Mathematics, Science, English, and Social Studies with our comprehensive school-level coaching programs.</p>
                            <ul className="course-features">
                                <li><i className="fas fa-check-circle"></i> Daily Homework Sheets</li>
                                <li><i className="fas fa-check-circle"></i> Chapter-wise Tests</li>
                                <li><i className="fas fa-check-circle"></i> Interactive Doubt Sessions</li>
                             </ul>
                        </div>
                    </div>

                    <div className="course-card">
                        <div className="course-card-body">
                            <div className="course-icon-box">
                                <i className="fas fa-balance-scale"></i>
                            </div>
                            <h3>11th & 12th Commerce</h3>
                            <p>Deep-dive into Accountancy, Business Studies, Economics, and Statistics with highly experienced coaching faculty.</p>
                            <ul className="course-features">
                                <li><i className="fas fa-check-circle"></i> Board Exam Prep Series</li>
                                <li><i className="fas fa-check-circle"></i> Formula Sheets & Key Notes</li>
                                <li><i className="fas fa-check-circle"></i> Detailed Assignment Reviews</li>
                            </ul>
                        </div>
                    </div>

                    <div className="course-card">
                        <div className="course-card-body">
                            <div className="course-icon-box">
                                <i className="fas fa-graduation-cap"></i>
                            </div>
                            <h3>Mock Board Exams</h3>
                            <p>Ultimate board-level preparation covering comprehensive test papers, timing strategies, and detailed answer sheet reviews.</p>
                            <ul className="course-features">
                                <li><i className="fas fa-check-circle"></i> Real-time Paper Pattern</li>
                                <li><i className="fas fa-check-circle"></i> Performance Analysis</li>
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
                    <p>Learn from standard-setting educators committed to your academic success.</p>
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
                        <p>Renowned educator mentoring students on physics, chemistry, and biological systems.</p>
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
                        <p>Over 15 years of experience in teaching subjects to class 5th to 12th.</p>
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
                            "The mock board exam series and detailed evaluation reports helped me identify my weak spots. I cleared my 10th Board with a top rank!"
                        </p>
                        <div className="testimonial-user">
                            <div className="testimonial-avatar">
                                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=128&auto=format&fit=crop" alt="Student avatar" />
                            </div>
                            <div className="testimonial-info">
                                <h4>Pooja Patel</h4>
                                <p>Standard 10 Ranker</p>
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
                    <h2>Get In Touch</h2>
                    <p>Have any queries? Reach out to us, and our academic counsellors will get back to you shortly.</p>
                </div>
                <div className="contact-container">
                    <div className="contact-info-section">
                        <h3>Navkar Classes Office</h3>
                        <p>We are located in GIDC colony, Vadodara. Feel free to call us or stop by.</p>
                        <div className="contact-methods">
                            <div className="contact-method-item">
                                <div className="contact-method-icon">
                                    <i className="fas fa-map-marker-alt"></i>
                                </div>
                                <div className="contact-method-text">
                                    <h4>Our Address</h4>
                                    <p>B-1/10 GIDC Colony,OPP. ESI Hospital, Near Vegetable Market, Manjalpur Road, Vadodara, Gujarat - 390011</p>
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
                        <form onSubmit={(e) => { e.preventDefault(); alert("Thank you for contacting us! We'll get back to you soon."); }}>
                            <div className="contact-form-group">
                                <label htmlFor="c-name">Full Name</label>
                                <input type="text" id="c-name" className="contact-input" placeholder="Enter your name" required />
                            </div>
                            <div className="contact-form-group">
                                <label htmlFor="c-email">Email Address</label>
                                <input type="email" id="c-email" className="contact-input" placeholder="Enter your email" required />
                            </div>
                            <div className="contact-form-group">
                                <label htmlFor="c-msg">Message / Query</label>
                                <textarea id="c-msg" className="contact-textarea" placeholder="How can we help you?" required></textarea>
                            </div>
                            <button type="submit" className="landing-btn-primary" style={{ width: "100%" }}>
                                Send Message
                            </button>
                        </form>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <p>&copy; {new Date().getFullYear()} Navkar Classes. All Rights Reserved. Built for student excellence.</p>
            </footer>
        </div>
    );
};

export default Landing;
