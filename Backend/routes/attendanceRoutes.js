const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// Helper to check if role can manage attendance
const isStaffUser = (req, res, next) => {
  if (req.user && (req.user.role === "staff" || req.user.role === "admin")) {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Staff only." });
  }
};

// ===============================
// GET STUDENTS IN A BATCH
// ===============================
router.get("/students/:batchId", authMiddleware, isStaffUser, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, st.name, u.email, st.mobile
       FROM students st
       JOIN users u ON st.user_id = u.id
       WHERE u.role = 'student' AND u.is_active = TRUE AND st.is_active = TRUE AND st.batch_id = ?
       ORDER BY st.name ASC`,
      [req.params.batchId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching batch students", error: err.message });
  }
});

// ===============================
// SUBMIT ATTENDANCE (ADMIN/STAFF ONLY)
// ===============================
router.post("/submit", authMiddleware, isStaffUser, async (req, res) => {
  const { batchId, date, attendanceData } = req.body; // attendanceData is array of { studentId, status }
  if (!batchId || !date || !attendanceData || !Array.isArray(attendanceData)) {
    return res.status(400).json({ message: "Batch, Date, and Attendance List are required" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const record of attendanceData) {
      const { studentId, status } = record;
      
      // Upsert attendance record
      const [exist] = await connection.execute(
        "SELECT id FROM attendance WHERE student_id = ? AND date = ?",
        [studentId, date]
      );

      if (exist.length > 0) {
        await connection.execute(
          "UPDATE attendance SET status = ?, batch_id = ? WHERE student_id = ? AND date = ?",
          [status, batchId, studentId, date]
        );
      } else {
        await connection.execute(
          "INSERT INTO attendance (batch_id, student_id, date, status) VALUES (?, ?, ?, ?)",
          [batchId, studentId, date, status]
        );
      }
    }

    await connection.commit();
    res.json({ message: "Attendance marked successfully" });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: "Error saving attendance logs", error: err.message });
  } finally {
    connection.release();
  }
});

// ===============================
// GET ATTENDANCE HISTORY
// ===============================
router.get("/history", authMiddleware, async (req, res) => {
  try {
    if (req.user.role === "student") {
      // Return student's personal attendance history
      const [rows] = await pool.execute(
        `SELECT a.*, b.name AS batch_name 
         FROM attendance a 
         JOIN batches b ON a.batch_id = b.id
         WHERE a.student_id = ? 
         ORDER BY a.date DESC`,
        [req.user.id]
      );
      return res.json(rows);
    }

    // Admin/Staff: fetch logs by batch and/or date
    const { batchId, date } = req.query;
    if (!batchId) {
      return res.status(400).json({ message: "Batch ID is required for administrative query" });
    }

    let query = `
      SELECT a.*, st.name AS student_name, u.email AS student_email
      FROM attendance a
      JOIN users u ON a.student_id = u.id
      JOIN students st ON st.user_id = u.id
      WHERE a.batch_id = ?
    `;
    const params = [batchId];

    if (date) {
      query += " AND a.date = ?";
      params.push(date);
    }

    query += " ORDER BY a.date DESC, u.name ASC";
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error retrieving attendance logs", error: err.message });
  }
});

module.exports = router;
