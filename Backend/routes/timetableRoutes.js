const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// Helper to check if role can manage academic schedules
const isStaffUser = (req, res, next) => {
  if (req.user && (req.user.role === "staff" || req.user.role === "admin")) {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Staff only." });
  }
};

// ===============================
// GET TIMETABLE
// ===============================
router.get("/", authMiddleware, async (req, res) => {
  try {
    let query = `
      SELECT t.*, b.name AS batch_name, b.standard_id, s.name AS standard_name,
             sub.name AS subject_name, tc.name AS teacher_name
      FROM timetable t
      JOIN batches b ON t.batch_id = b.id
      JOIN standards s ON b.standard_id = s.id
      JOIN subjects sub ON t.subject_id = sub.id
      JOIN teachers tc ON t.teacher_id = tc.id
    `;
    const params = [];

    if (req.user.role === "student") {
      // Get student's batch ID
      const [userRows] = await pool.execute("SELECT batch_id FROM students WHERE user_id = ?", [req.user.id]);
      if (userRows[0] && userRows[0].batch_id) {
        query += " WHERE t.batch_id = ?";
        params.push(userRows[0].batch_id);
      } else {
        return res.json([]);
      }
    } else {
      // Staff: optionally filter by batch and/or standard.
      const { batchId, standardId } = req.query;
      if (batchId) {
        query += " WHERE t.batch_id = ?";
        params.push(batchId);
      } else if (standardId) {
        query += " WHERE b.standard_id = ?";
        params.push(standardId);
      }
    }

    query += " ORDER BY FIELD(t.day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), t.time_slot";
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching timetable", error: err.message });
  }
});

// ===============================
// CREATE SCHEDULE ENTRY
// ===============================
router.post("/", authMiddleware, isStaffUser, async (req, res) => {
  const { batchId, day, subjectId, teacherId, timeSlot, room } = req.body;
  if (!batchId || !day || !subjectId || !teacherId || !timeSlot || !room) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const [relations] = await pool.execute(
      `SELECT b.id
       FROM batches b
       JOIN subjects sub ON sub.standard_id = b.standard_id
       WHERE b.id = ? AND sub.id = ?
       LIMIT 1`,
      [batchId, subjectId]
    );
    if (relations.length === 0) {
      return res.status(400).json({ message: "Subject must belong to the selected batch class" });
    }

    const [result] = await pool.execute(
      `INSERT INTO timetable (batch_id, day, subject_id, teacher_id, time_slot, room) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [batchId, day, subjectId, teacherId, timeSlot, room]
    );

    // Fetch the inserted record fully hydrated
    const [inserted] = await pool.execute(`
      SELECT t.*, b.name AS batch_name, b.standard_id, s.name AS standard_name,
             sub.name AS subject_name, tc.name AS teacher_name
      FROM timetable t
      JOIN batches b ON t.batch_id = b.id
      JOIN standards s ON b.standard_id = s.id
      JOIN subjects sub ON t.subject_id = sub.id
      JOIN teachers tc ON t.teacher_id = tc.id
      WHERE t.id = ?
    `, [result.insertId]);

    res.status(201).json(inserted[0]);
  } catch (err) {
    res.status(500).json({ message: "Error scheduling timetable entry", error: err.message });
  }
});

// ===============================
// DELETE SCHEDULE ENTRY
// ===============================
router.delete("/:id", authMiddleware, isStaffUser, async (req, res) => {
  try {
    await pool.execute("DELETE FROM timetable WHERE id = ?", [req.params.id]);
    res.json({ message: "Timetable entry deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting timetable entry", error: err.message });
  }
});

module.exports = router;
