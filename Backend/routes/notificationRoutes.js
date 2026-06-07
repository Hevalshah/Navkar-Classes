const express = require("express");
const router  = express.Router();
const { pool } = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// ─────────────────────────────────────────────────────────────────────────────
// SHARED helper – exported so other route files can use it
// ─────────────────────────────────────────────────────────────────────────────
const insertNotification = async ({ title, message, type, role, userId, referenceId, uniqueKey }) => {
  try {
    const notification = {
      title,
      message: message || title,
      type,
      role,
      userId: userId || null,
      referenceId: referenceId || null,
      uniqueKey
    };

    const [result] = await pool.execute(
      `INSERT IGNORE INTO notifications
        (title, message, type, role, user_id, reference_id, unique_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        notification.title,
        notification.message,
        notification.type,
        notification.role,
        notification.userId,
        notification.referenceId,
        notification.uniqueKey
      ]
    );

    console.log("Notification Created", {
      ...notification,
      insertId: result.insertId,
      affectedRows: result.affectedRows
    });
  } catch (err) {
    // Never crash a business transaction because of a notification failure
    console.error("[Notification] insert error:", err.message);
  }
};

const getNotificationsForUser = async (req, roleOverride) => {
  const { id: userId, role } = req.user;
  const requestedRole = roleOverride || role;
  const normalizedRole = String(requestedRole).toLowerCase();

  if (normalizedRole !== role) {
    const error = new Error("Role does not match authenticated user");
    error.statusCode = 403;
    throw error;
  }

  const query = `SELECT
         n.id,
         n.title,
         n.message,
         n.type,
         n.role,
         n.user_id,
         n.reference_id,
         n.created_at,
         (nr.id IS NOT NULL) AS is_read
       FROM notifications n
       LEFT JOIN notification_reads nr
         ON nr.notification_id = n.id AND nr.user_id = ?
       WHERE n.role = ?
         AND (n.user_id IS NULL OR n.user_id = ?)
       ORDER BY n.created_at DESC, n.id DESC
       LIMIT 30`;
  const params = [userId, normalizedRole, userId];

  console.log("[Notification] Query", { role: normalizedRole, userId, query, params });
  const [rows] = await pool.execute(query, params);
  console.log("Notifications Returned", rows);
  return rows;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notifications  — fetch real notifications for the logged-in user
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", authMiddleware, async (req, res) => {
  try {
    const rows = await getNotificationsForUser(req);
    res.json(rows);
  } catch (err) {
    console.error("[Notification] GET /:", err.message);
    res.status(err.statusCode || 500).json({ message: "Error fetching notifications", error: err.message });
  }
});

router.get("/student", authMiddleware, async (req, res) => {
  try {
    const rows = await getNotificationsForUser(req, "student");
    res.json(rows);
  } catch (err) {
    console.error("[Notification] GET /student:", err.message);
    res.status(err.statusCode || 500).json({ message: "Error fetching student notifications", error: err.message });
  }
});

router.get("/teacher", authMiddleware, async (req, res) => {
  try {
    const rows = await getNotificationsForUser(req, "teacher");
    res.json(rows);
  } catch (err) {
    console.error("[Notification] GET /teacher:", err.message);
    res.status(err.statusCode || 500).json({ message: "Error fetching teacher notifications", error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notifications/unread — unread only
// ─────────────────────────────────────────────────────────────────────────────
router.get("/unread", authMiddleware, async (req, res) => {
  try {
    const { id: userId, role } = req.user;

    const [rows] = await pool.execute(
      `SELECT
         n.id,
         n.title,
         n.message,
         n.type,
         n.role,
         n.user_id,
         n.reference_id,
         n.created_at,
         FALSE AS is_read
       FROM notifications n
       LEFT JOIN notification_reads nr
         ON nr.notification_id = n.id AND nr.user_id = ?
       WHERE n.role = ?
         AND (n.user_id IS NULL OR n.user_id = ?)
         AND nr.id IS NULL
       ORDER BY n.created_at DESC, n.id DESC
       LIMIT 30`,
      [userId, role, userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("[Notification] GET /unread:", err.message);
    res.status(500).json({ message: "Error fetching unread notifications", error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/notifications/read-all — mark all as read
// NOTE: This MUST be defined BEFORE /:id/read to avoid Express treating
//       "read-all" as an :id value
// ─────────────────────────────────────────────────────────────────────────────
router.put("/read-all", authMiddleware, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    await pool.execute(
      `INSERT IGNORE INTO notification_reads (notification_id, user_id)
       SELECT id, ?
       FROM notifications
       WHERE role = ? AND (user_id IS NULL OR user_id = ?)`,
      [userId, role, userId]
    );
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Error marking all notifications as read", error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/notifications/:id/read — mark one as read
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id/read", authMiddleware, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    await pool.execute(
      `INSERT IGNORE INTO notification_reads (notification_id, user_id)
       SELECT id, ?
       FROM notifications
       WHERE id = ? AND role = ? AND (user_id IS NULL OR user_id = ?)`,
      [userId, req.params.id, role, userId]
    );
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Error marking notification as read", error: err.message });
  }
});

module.exports = router;
module.exports.insertNotification = insertNotification;
