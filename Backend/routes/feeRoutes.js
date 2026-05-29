const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// ===============================
// GET FEE RECORDS
// ===============================
router.get("/", authMiddleware, async (req, res) => {
  try {
    if (req.user.role === "student") {
      // Get student personal logs
      const [rows] = await pool.execute(
        "SELECT * FROM fee_records WHERE student_id = ? ORDER BY paid_date DESC, id DESC",
        [req.user.id]
      );
      return res.json(rows);
    }

    // Admin: retrieve all logs
    const [rows] = await pool.execute(`
      SELECT f.*, st.name AS student_name, u.email AS student_email, b.name AS batch_name
      FROM fee_records f
      JOIN users u ON f.student_id = u.id
      JOIN students st ON st.user_id = u.id
      LEFT JOIN batches b ON st.batch_id = b.id
      ORDER BY f.paid_date DESC, f.id DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching fee records", error: err.message });
  }
});

// ===============================
// PROCESS FEE PAYMENT (STUDENT OR ADMIN ACTION)
// ===============================
router.post("/pay", authMiddleware, async (req, res) => {
  const { studentId, amount, paymentMode, referenceNo } = req.body;
  
  // Student can only pay their own fee; Admin can pay on behalf of anyone
  const targetStudentId = req.user.role === "student" ? req.user.id : studentId;
  const payMode = paymentMode || "Online";

  if (!amount || !targetStudentId) {
    return res.status(400).json({ message: "Amount and Student ID are required fields" });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO fee_records (student_id, amount, paid_date, payment_mode, reference_no, status) 
       VALUES (?, ?, CURDATE(), ?, ?, 'Paid')`,
      [targetStudentId, amount, payMode, referenceNo || null]
    );

    res.status(201).json({
      id: result.insertId,
      message: "Payment recorded successfully",
      amount,
      paid_date: new Date()
    });
  } catch (err) {
    res.status(500).json({ message: "Error recording fee payment", error: err.message });
  }
});

module.exports = router;
