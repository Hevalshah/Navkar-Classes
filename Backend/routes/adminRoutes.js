const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// Helper to ensure role is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Admins only." });
  }
};

const isStaffUser = (req, res, next) => {
  if (req.user && (req.user.role === "staff" || req.user.role === "admin")) {
    return next();
  }
  res.status(403).json({ message: "Access denied. Staff only." });
};

// ===============================
// STANDARDS CRUD
// ===============================
router.get("/standards", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM standards ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching standards", error: err.message });
  }
});

router.post("/standards", authMiddleware, isAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Standard name is required" });
  try {
    const [result] = await pool.execute("INSERT INTO standards (name) VALUES (?)", [name]);
    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    res.status(500).json({ message: "Error creating standard", error: err.message });
  }
});

router.put("/standards/:id", authMiddleware, isAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Standard name is required" });
  try {
    await pool.execute("UPDATE standards SET name = ? WHERE id = ?", [name, req.params.id]);
    res.json({ id: req.params.id, name });
  } catch (err) {
    res.status(500).json({ message: "Error updating standard", error: err.message });
  }
});

router.delete("/standards/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    await pool.execute("DELETE FROM standards WHERE id = ?", [req.params.id]);
    res.json({ message: "Standard deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting standard", error: err.message });
  }
});

// ===============================
// BATCHES CRUD
// ===============================
router.get("/batches", async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT b.*, s.name AS standard_name 
      FROM batches b 
      JOIN standards s ON b.standard_id = s.id 
      ORDER BY b.id DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching batches", error: err.message });
  }
});

router.post("/batches", authMiddleware, isAdmin, async (req, res) => {
  const { name, standardId } = req.body;
  if (!name || !standardId) return res.status(400).json({ message: "Name and Standard ID are required" });
  try {
    const [result] = await pool.execute("INSERT INTO batches (name, standard_id) VALUES (?, ?)", [name, standardId]);
    res.status(201).json({ id: result.insertId, name, standard_id: standardId });
  } catch (err) {
    res.status(500).json({ message: "Error creating batch", error: err.message });
  }
});

router.put("/batches/:id", authMiddleware, isAdmin, async (req, res) => {
  const { name, standardId } = req.body;
  if (!name || !standardId) return res.status(400).json({ message: "Name and Standard ID are required" });
  try {
    await pool.execute("UPDATE batches SET name = ?, standard_id = ? WHERE id = ?", [name, standardId, req.params.id]);
    res.json({ id: req.params.id, name, standard_id: standardId });
  } catch (err) {
    res.status(500).json({ message: "Error updating batch", error: err.message });
  }
});

router.delete("/batches/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    await pool.execute("DELETE FROM batches WHERE id = ?", [req.params.id]);
    res.json({ message: "Batch deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting batch", error: err.message });
  }
});

// ===============================
// SUBJECTS CRUD
// ===============================
router.get("/subjects", async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT sub.*, s.name AS standard_name 
      FROM subjects sub 
      JOIN standards s ON sub.standard_id = s.id 
      ORDER BY sub.id DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching subjects", error: err.message });
  }
});

router.post("/subjects", authMiddleware, isAdmin, async (req, res) => {
  const { name, standardId } = req.body;
  if (!name || !standardId) return res.status(400).json({ message: "Subject name and Standard ID are required" });
  try {
    const [result] = await pool.execute("INSERT INTO subjects (name, standard_id) VALUES (?, ?)", [name, standardId]);
    res.status(201).json({ id: result.insertId, name, standard_id: standardId });
  } catch (err) {
    res.status(500).json({ message: "Error creating subject", error: err.message });
  }
});

router.put("/subjects/:id", authMiddleware, isAdmin, async (req, res) => {
  const { name, standardId } = req.body;
  if (!name || !standardId) return res.status(400).json({ message: "Subject name and Standard ID are required" });
  try {
    await pool.execute("UPDATE subjects SET name = ?, standard_id = ? WHERE id = ?", [name, standardId, req.params.id]);
    res.json({ id: req.params.id, name, standard_id: standardId });
  } catch (err) {
    res.status(500).json({ message: "Error updating subject", error: err.message });
  }
});

router.delete("/subjects/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    await pool.execute("DELETE FROM subjects WHERE id = ?", [req.params.id]);
    res.json({ message: "Subject deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting subject", error: err.message });
  }
});

// ===============================
// TEACHERS CRUD
// ===============================
router.get("/teachers", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM teachers ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching teachers", error: err.message });
  }
});

router.post("/teachers", authMiddleware, isAdmin, async (req, res) => {
  const { name, email, mobile } = req.body;
  if (!name || !email || !mobile) return res.status(400).json({ message: "Name, email and mobile are required" });
  try {
    const [result] = await pool.execute("INSERT INTO teachers (name, email, mobile) VALUES (?, ?, ?)", [name, email, mobile]);
    res.status(201).json({ id: result.insertId, name, email, mobile });
  } catch (err) {
    res.status(500).json({ message: "Error creating teacher", error: err.message });
  }
});

router.put("/teachers/:id", authMiddleware, isAdmin, async (req, res) => {
  const { name, email, mobile } = req.body;
  if (!name || !email || !mobile) return res.status(400).json({ message: "Name, email and mobile are required" });
  try {
    await pool.execute("UPDATE teachers SET name = ?, email = ?, mobile = ? WHERE id = ?", [name, email, mobile, req.params.id]);
    res.json({ id: req.params.id, name, email, mobile });
  } catch (err) {
    res.status(500).json({ message: "Error updating teacher", error: err.message });
  }
});

router.delete("/teachers/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    await pool.execute("DELETE FROM teachers WHERE id = ?", [req.params.id]);
    res.json({ message: "Teacher deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting teacher", error: err.message });
  }
});

// ===============================
// FETCH REGISTERED STUDENTS (For lists/attendance)
// ===============================
router.get("/students", authMiddleware, isStaffUser, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const offset = (page - 1) * limit;
    const search = (req.query.search || "").trim();
    const filters = ["u.role = 'student'"];
    const params = [];

    if (req.query.standardId) {
      filters.push("st.standard_id = ?");
      params.push(req.query.standardId);
    }
    if (req.query.batchId) {
      filters.push("st.batch_id = ?");
      params.push(req.query.batchId);
    }
    if (search) {
      filters.push("(st.name LIKE ? OR u.email LIKE ? OR st.mobile LIKE ?)");
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = `WHERE ${filters.join(" AND ")}`;
    const [rows] = await pool.execute(`
      SELECT u.id, st.id AS student_id, st.name, st.parent_name, st.mobile,
             u.email, u.username, st.address, st.standard_id, st.batch_id,
             st.is_active, st.created_at,
             s.name AS standard_name, b.name AS batch_name
      FROM students st
      JOIN users u ON st.user_id = u.id
      LEFT JOIN standards s ON st.standard_id = s.id
      LEFT JOIN batches b ON st.batch_id = b.id
      ${whereClause}
      ORDER BY st.created_at DESC, st.name ASC
      LIMIT ${limit} OFFSET ${offset}
    `, params);

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM students st
       JOIN users u ON st.user_id = u.id
       ${whereClause}`,
      params
    );

    res.json({
      students: rows,
      pagination: {
        page,
        limit,
        total: countRows[0].total,
        totalPages: Math.max(Math.ceil(countRows[0].total / limit), 1)
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching students", error: err.message });
  }
});

router.delete("/students/:id", authMiddleware, isStaffUser, async (req, res) => {
  try {
    const [result] = await pool.execute(
      `UPDATE students st
       JOIN users u ON st.user_id = u.id
       SET st.is_active = FALSE, u.is_active = FALSE
       WHERE u.id = ? AND u.role = 'student' AND st.is_active = TRUE`,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Active student not found" });
    }

    res.json({ message: "Student removed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error removing student", error: err.message });
  }
});

module.exports = router;
