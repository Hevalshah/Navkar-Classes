import React, { useEffect, useState, useCallback } from "react";
import "../Styles/dashboard.css";

const TYPE_ICON = {
  fee:        { icon: "fas fa-rupee-sign",       color: "#10b981" },
  material:   { icon: "fas fa-file-alt",         color: "#6366f1" },
  test:       { icon: "fas fa-pencil-alt",        color: "#f59e0b" },
  attendance: { icon: "fas fa-user-check",        color: "#3b82f6" },
  timetable:  { icon: "fas fa-calendar-alt",      color: "#8b5cf6" },
  registration:{ icon: "fas fa-user-plus",        color: "#ec4899" },
  default:    { icon: "fas fa-bell",              color: "#64748b" },
};

const NotificationPanel = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);

  const token = () => localStorage.getItem("token");

  const formatDate = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("en-GB", {
      day:   "2-digit",
      month: "short",
    });
  };

  const fetchNotifications = useCallback(async () => {
    const t = token();
    if (!t) { setNotifications([]); setLoading(false); return; }
    try {
      const role = localStorage.getItem("role");
      const roleEndpoint =
        role === "student" || role === "teacher"
          ? `/${role}`
          : "";

      const res = await fetch(`http://localhost:5000/api/notifications${roleEndpoint}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setNotifications(data.map((n) => ({
        id:      n.id,
        title:   n.title,
        message: n.message,
        type:    n.type || "default",
        date:    formatDate(n.created_at),
        isRead:  Boolean(n.is_read),
      })));
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Auto-refresh every 60 seconds
    const timer = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    const t = token();
    if (!t) return;
    try {
      await fetch(`http://localhost:5000/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${t}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    const t = token();
    if (!t) return;
    try {
      await fetch("http://localhost:5000/api/notifications/read-all", {
        method: "PUT",
        headers: { Authorization: `Bearer ${t}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch { /* silent */ }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="notification-panel">
      <div className="panel-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3>
          <i className="fas fa-bell" />
          {" "}NOTIFICATION
          {unreadCount > 0 && (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginLeft: "8px",
              minWidth: "20px",
              height: "20px",
              padding: "0 5px",
              borderRadius: "999px",
              background: "#ef4444",
              color: "#fff",
              fontSize: "11px",
              fontWeight: 700,
              lineHeight: 1,
            }}>
              {unreadCount}
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              background: "none",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: "6px",
              color: "inherit",
              fontSize: "11px",
              padding: "3px 8px",
              cursor: "pointer",
              opacity: 0.75,
              whiteSpace: "nowrap",
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="notification-list">
        {loading ? (
          <div className="no-record">
            <i className="fas fa-spinner fa-spin" /> Loading…
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((notif) => {
            const meta = TYPE_ICON[notif.type] || TYPE_ICON.default;
            return (
              <div
                key={notif.id}
                className="notification-item"
                onClick={() => !notif.isRead && markAsRead(notif.id)}
                style={{ opacity: notif.isRead ? 0.65 : 1, cursor: notif.isRead ? "default" : "pointer" }}
              >
                {/* Unread dot */}
                {!notif.isRead && (
                  <span style={{
                    position: "absolute",
                    left: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: "#ef4444",
                  }} />
                )}

                <div className="notif-icon-box" style={{ background: meta.color + "22", color: meta.color }}>
                  <i className={meta.icon} />
                </div>

                <div className="notif-content">
                  <p className="notif-title">{notif.title}</p>
                  {notif.message && notif.message !== notif.title && (
                    <p style={{ margin: 0, fontSize: "11px", opacity: 0.7, marginTop: "2px" }}>
                      {notif.message}
                    </p>
                  )}
                </div>

                <div className="notif-date">{notif.date}</div>
              </div>
            );
          })
        ) : (
          <div className="no-record">
            <i className="fas fa-exclamation-circle" /> No new notifications
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
