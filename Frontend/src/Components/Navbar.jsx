import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../Styles/dashboard.css";
import logo from "../assets/navkar-logo.png";

const Navbar = ({ user, onLogout, role = "student" }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    const handleDropdownClick = (index) => {
        if (activeDropdown === index) {
            setActiveDropdown(null);
        } else {
            setActiveDropdown(index);
        }
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                {/* Logo Section */}
                <div className="navbar-logo">
                    <img src={logo} alt="Navkar Classes" />
                    <span className="institute-name">Navkar Classes</span>
                </div>

                {/* Mobile Menu Toggle */}
                <div className="mobile-menu-icon" onClick={toggleMobileMenu}>
                    <div className={`bar ${mobileMenuOpen ? "open" : ""}`}></div>
                    <div className={`bar ${mobileMenuOpen ? "open" : ""}`}></div>
                    <div className={`bar ${mobileMenuOpen ? "open" : ""}`}></div>
                </div>

                {/* Navigation Menu */}
                <ul className={`nav-menu ${mobileMenuOpen ? "active" : ""}`}>
                    <li className="nav-item">
                        <Link to={role === "admin" ? "/admin-dashboard" : "/dashboard"} className="nav-link">Dashboard</Link>
                    </li>

                    {/* Timetable Dropdown */}
                    <li
                        className={`nav-item dropdown ${activeDropdown === 1 ? "active" : ""}`}
                        onClick={() => handleDropdownClick(1)}
                        onMouseEnter={() => window.innerWidth > 768 && setActiveDropdown(1)}
                        onMouseLeave={() => window.innerWidth > 768 && setActiveDropdown(null)}
                    >
                        <span className="nav-link">Timetable <i className="fas fa-chevron-down"></i></span>
                        <div className="dropdown-menu">
                            <Link to="#" className="dropdown-item">{role === "admin" ? "Timetables" : "Timetable"}</Link>
                            <Link to="#" className="dropdown-item">Attendance</Link>
                        </div>
                    </li>

                    {/* Exam Dropdown */}
                    <li
                        className={`nav-item dropdown ${activeDropdown === 2 ? "active" : ""}`}
                        onClick={() => handleDropdownClick(2)}
                        onMouseEnter={() => window.innerWidth > 768 && setActiveDropdown(2)}
                        onMouseLeave={() => window.innerWidth > 768 && setActiveDropdown(null)}
                    >
                        <span className="nav-link">Exam <i className="fas fa-chevron-down"></i></span>
                        <div className="dropdown-menu">
                            <Link to="#" className="dropdown-item">Admit Card</Link>
                            <Link to="#" className="dropdown-item">Result</Link>
                        </div>
                    </li>

                    {/* Fee Dropdown */}
                    <li
                        className={`nav-item dropdown ${activeDropdown === 3 ? "active" : ""}`}
                        onClick={() => handleDropdownClick(3)}
                        onMouseEnter={() => window.innerWidth > 768 && setActiveDropdown(3)}
                        onMouseLeave={() => window.innerWidth > 768 && setActiveDropdown(null)}
                    >
                        <span className="nav-link">Fee <i className="fas fa-chevron-down"></i></span>
                        <div className="dropdown-menu">
                            {role === "student" && <Link to="#" className="dropdown-item">Pay Fees</Link>}
                            <Link to="#" className="dropdown-item">Fee History</Link>
                        </div>
                    </li>

                    {/* Courses Dropdown */}
                    <li
                        className={`nav-item dropdown ${activeDropdown === 5 ? "active" : ""}`}
                        onClick={() => handleDropdownClick(5)}
                        onMouseEnter={() => window.innerWidth > 768 && setActiveDropdown(5)}
                        onMouseLeave={() => window.innerWidth > 768 && setActiveDropdown(null)}
                    >
                        <span className="nav-link">Courses <i className="fas fa-chevron-down"></i></span>
                        <div className="dropdown-menu">
                            <Link to="#" className="dropdown-item">{role === "admin" ? "Add Materials" : "Materials"}</Link>
                            <Link to="#" className="dropdown-item">{role === "admin" ? "Add Tests" : "Tests"}</Link>
                        </div>
                    </li>

                    {/* Other Dropdown - Only for Student */}
                    {role === "student" && (
                        <li
                            className={`nav-item dropdown ${activeDropdown === 4 ? "active" : ""}`}
                            onClick={() => handleDropdownClick(4)}
                            onMouseEnter={() => window.innerWidth > 768 && setActiveDropdown(4)}
                            onMouseLeave={() => window.innerWidth > 768 && setActiveDropdown(null)}
                        >
                            <span className="nav-link">Other <i className="fas fa-chevron-down"></i></span>
                            <div className="dropdown-menu">
                                <Link to="#" className="dropdown-item">Certificate Request</Link>
                                <Link to="#" className="dropdown-item">Feedback</Link>
                            </div>
                        </li>
                    )}
                </ul>

                {/* User Profile Section */}
                <div className="navbar-profile">
                    <div className="profile-trigger">
                        <img
                            src={user?.profileImg || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"}
                            alt="Profile"
                            className="nav-profile-img"
                        />
                        <span className="nav-user-name">Hi, {user?.name || "User"}</span>
                        <div className="profile-dropdown">
                            <Link to="#" className="dropdown-item"><i className="fas fa-user"></i> My Profile</Link>
                            <Link to="#" className="dropdown-item"><i className="fas fa-key"></i> Change Password</Link>
                            <div className="dropdown-divider"></div>
                            <button onClick={onLogout} className="dropdown-item logout-item">
                                <i className="fas fa-sign-out-alt"></i> Log Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
