const express  = require("express");
const router   = express.Router();
const { pool } = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const { insertNotification } = require("./notificationRoutes");

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/fees  — fetch fee records
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", authMiddleware, async (req, res) => {
  try {
    if (req.user.role === "student") {
      const [rows] = await pool.execute(
        "SELECT * FROM fee_records WHERE student_id = ? ORDER BY id ASC",
        [req.user.id]
      );
      return res.json(rows);
    }

    // Admin / Staff — all records
    const [rows] = await pool.execute(`
      SELECT f.*, st.name AS student_name, u.email AS student_email, b.name AS batch_name
      FROM   fee_records f
      JOIN   users    u  ON f.student_id = u.id
      JOIN   students st ON st.user_id   = u.id
      LEFT JOIN batches b ON st.batch_id = b.id
      ORDER BY f.id ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching fee records", error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/fees/pay  — record a fee payment and fire notifications
// ─────────────────────────────────────────────────────────────────────────────
router.post("/pay", authMiddleware, async (req, res) => {
  const { studentId, amount, paymentMode, referenceNo } = req.body;

  // Student pays own fee; Admin/Staff pay on behalf of any student
  const targetStudentId = req.user.role === "student" ? req.user.id : studentId;
  const payMode         = paymentMode || "Online";

  if (!amount || !targetStudentId) {
    return res.status(400).json({ message: "Amount and Student ID are required fields" });
  }

  try {
    // ── 1. Record the payment ────────────────────────────────────────────────
    const [result] = await pool.execute(
      `INSERT INTO fee_records (student_id, amount, paid_date, payment_mode, reference_no, status)
       VALUES (?, ?, CURDATE(), ?, ?, 'Paid')`,
      [targetStudentId, amount, payMode, referenceNo || null]
    );
    const feeId = result.insertId;

    // ── 2. Fetch the student's full name ─────────────────────────────────────
    let studentName = "Student";
    try {
      const [[stu]] = await pool.execute(
        "SELECT name FROM students WHERE user_id = ? LIMIT 1",
        [targetStudentId]
      );
      if (stu) studentName = stu.name;
    } catch (_) {}

    const amtDisplay = `₹${Number(amount).toLocaleString("en-IN")}`;
    const ts = `${feeId}`; // use feeId as unique discriminator — guaranteed unique

    // ── 3. Notify the student ────────────────────────────────────────────────
    await insertNotification({
      title:      "Fee paid successfully",
      message:    `Fees paid successfully: ${amtDisplay}`,
      type:       "fee",
      role:       "student",
      userId:     targetStudentId,
      referenceId: feeId,
      uniqueKey:  `student:${targetStudentId}:fee-paid:${ts}`
    });

    // ── 4. Notify teachers ───────────────────────────────────────────────────
    const teacherMessage = `${studentName} paid ${amtDisplay} via ${payMode}`;
    await insertNotification({
      title:      teacherMessage,
      message:    teacherMessage,
      type:       "fee",
      role:       "teacher",
      referenceId: feeId,
      uniqueKey:  `teacher:fee-collected:${ts}`
    });

    // ── 5. Notify admin ──────────────────────────────────────────────────────
    await insertNotification({
      title:      "Fee Payment Recorded",
      message:    `${studentName} paid ${amtDisplay} via ${payMode}.`,
      type:       "fee",
      role:       "admin",
      referenceId: feeId,
      uniqueKey:  `admin:fee-collected:${ts}`
    });

    // ── 6. Notify staff ──────────────────────────────────────────────────────
    await insertNotification({
      title:      "Fee Payment Recorded",
      message:    `${studentName} paid ${amtDisplay} via ${payMode}.`,
      type:       "fee",
      role:       "staff",
      referenceId: feeId,
      uniqueKey:  `staff:fee-collected:${ts}`
    });

    res.status(201).json({
      id:       feeId,
      message:  "Payment recorded successfully",
      amount,
      paid_date: new Date()
    });
  } catch (err) {
    res.status(500).json({ message: "Error recording fee payment", error: err.message });
  }
});

module.exports = router;
