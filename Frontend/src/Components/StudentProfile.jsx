import React from "react";
import "../Styles/dashboard.css";

const StudentProfile = ({ user }) => {
    if (!user) return <div className="student-profile-card">Loading...</div>;

    const profileId = user._id ?? user.id;
    const displayId = profileId ? String(profileId).slice(-6).toUpperCase() : "N/A";

    return (
        <div className="student-profile-card">
            <div className="profile-image-container">
                <img
                    src={user.profileImg || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"}
                    alt={user.name}
                    className="profile-main-img"
                />
            </div>

            <div className="profile-info">
                <h2 className="profile-name">{user.name}</h2>
                <span className="status-badge">Active</span>

                <div className="profile-details-list">
                    <p className="profile-detail-item">
                        <strong>{user.role === 'admin' ? 'Faculty' : 'Student'}</strong>
                    </p>
                    <p className="profile-detail-item highlight">
                        {displayId}
                    </p>
                    <p className="profile-detail-item small">
                        Mobile: {user.mobile}
                    </p>
                    {user.parentName && (
                        <p className="profile-detail-item small">
                            Parent: {user.parentName}
                        </p>
                    )}
                    <p className="profile-detail-item small email">
                        Email: {user.email}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default StudentProfile;
