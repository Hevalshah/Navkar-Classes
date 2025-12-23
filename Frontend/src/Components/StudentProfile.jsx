import React from "react";
import "../Styles/dashboard.css";

const StudentProfile = ({ user }) => {
    return (
        <div className="student-profile-card">
            <div className="profile-image-container">
                <img src={user.profileImg} alt={user.name} className="profile-main-img" />
            </div>

            <div className="profile-info">
                <h2 className="profile-name">{user.name}</h2>
                <span className="status-badge">Active</span>

                <div className="profile-details-list">
                    <p className="profile-detail-item">
                        <strong>{user.course}</strong>
                    </p>
                    <p className="profile-detail-item highlight">
                        {user.id}
                    </p>
                    <p className="profile-detail-item small">
                        {user.dob}
                    </p>
                    <p className="profile-detail-item small">
                        Mobile: {user.mobile}
                    </p>
                    <p className="profile-detail-item small">
                        Mother: {user.motherName}
                    </p>
                    <p className="profile-detail-item small email">
                        Email: {user.email}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default StudentProfile;
