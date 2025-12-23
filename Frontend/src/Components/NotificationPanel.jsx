import React from "react";
import "../Styles/dashboard.css";

const NotificationPanel = () => {
    // Static notifications list
    const notifications = [
        {
            id: 1,
            title: "Admit Card Generated for BTech Semester - 7 Regular Exam",
            date: "09-Oct",
        },
        {
            id: 2,
            title: "Admit Card Generated for BTech Semester - 7 Supplementary Exam",
            date: "09-Oct",
        },
        {
            id: 3,
            title: "Diwali Vacation Circular",
            date: "01-Oct",
        },
        {
            id: 4,
            title: "Result Declared for Mid-Semester Exam",
            date: "28-Sep",
        }
    ];

    return (
        <div className="notification-panel">
            <div className="panel-header">
                <h3><i className="fas fa-bell"></i> NOTIFICATION</h3>
            </div>

            {/* Tabs removed as per request */}

            <div className="notification-list">
                {notifications.length > 0 ? (
                    notifications.map(notif => (
                        <div key={notif.id} className="notification-item">
                            <div className="notif-icon-box">
                                <i className="fas fa-bell"></i>
                            </div>
                            <div className="notif-content">
                                <p className="notif-title">{notif.title}</p>
                            </div>
                            <div className="notif-date">{notif.date}</div>
                        </div>
                    ))
                ) : (
                    <div className="no-record">
                        <i className="fas fa-exclamation-circle"></i> No Record Found
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationPanel;
