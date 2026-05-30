const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const Teacher = require("../models/Teacher");

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

const isAcademicUser = (req, res, next) => {
  if (req.user && (req.user.role === "staff" || req.user.role === "admin" || req.user.role === "teacher")) {
    return next();
  }
  res.status(403).json({ message: "Access denied. Authorized roles only." });
};

const isStudentManager = isAcademicUser;

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
router.get("/teachers", authMiddleware, isAcademicUser, async (req, res) => {
  try {
    const rows = await Teacher.findAll();
    res.json(rows.map(Teacher.publicTeacher));
  } catch (err) {
    res.status(500).json({ message: "Error fetching teachers", error: err.message });
  }
});

router.post("/teachers", authMiddleware, isStaffUser, async (req, res) => {
  const { name, email, mobile, password, status } = req.body;
  if (!name || !email || !mobile || !password) {
    return res.status(400).json({ message: "Name, email, mobile, and password are required" });
  }
  try {
    const existing = await Teacher.findByEmail(email);
    if (existing) {
      return res.status(400).json({ message: "Teacher with this email already registered" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newTeacher = await Teacher.create({
      name,
      email,
      mobile,
      password: hashedPassword,
      status: status || "Active"
    });
    res.status(201).json(Teacher.publicTeacher(newTeacher));
  } catch (err) {
    res.status(500).json({ message: "Error creating teacher", error: err.message });
  }
});

router.put("/teachers/:id", authMiddleware, isStaffUser, async (req, res) => {
  const { name, email, mobile, password, status } = req.body;
  if (!name || !email || !mobile || !status) {
    return res.status(400).json({ message: "Name, email, mobile, and status are required" });
  }
  try {
    const existing = await Teacher.findByEmail(email);
    if (existing && existing.id !== parseInt(req.params.id)) {
      return res.status(400).json({ message: "Email is already registered by another teacher" });
    }
    let updatedData = { name, email, mobile, status };
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updatedData.password = await bcrypt.hash(password, salt);
    }
    const updatedTeacher = await Teacher.update(parseInt(req.params.id), updatedData);
    res.json(Teacher.publicTeacher(updatedTeacher));
  } catch (err) {
    res.status(500).json({ message: "Error updating teacher", error: err.message });
  }
});

router.delete("/teachers/:id", authMiddleware, isStaffUser, async (req, res) => {
  try {
    await Teacher.remove(parseInt(req.params.id));
    res.json({ message: "Teacher deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting teacher", error: err.message });
  }
});

// ===============================
// FETCH REGISTERED STUDENTS (For lists/attendance)
// ===============================
router.get("/students", authMiddleware, isAcademicUser, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const offset = (page - 1) * limit;
    const search = (req.query.search || "").trim();
    const includeInactive = req.query.includeInactive === "true";
    const filters = ["u.role = 'student'"];
    const params = [];

    if (!includeInactive) {
      filters.push("u.is_active = TRUE");
      filters.push("st.is_active = TRUE");
    }

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

router.put("/students/:id", authMiddleware, isStudentManager, async (req, res) => {
  const { name, email, mobile, parentName, address, standardId, batchId, isActive } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: "Student name and email are required" });
  }

  const normalizedStandardId = standardId ? parseInt(standardId, 10) : null;
  const normalizedBatchId = batchId ? parseInt(batchId, 10) : null;
  const normalizedIsActive = isActive === undefined ? true : Boolean(isActive);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [studentRows] = await connection.execute(
      `SELECT st.id AS student_id, u.id AS user_id
       FROM students st
       JOIN users u ON st.user_id = u.id
       WHERE u.id = ? AND u.role = 'student'
       LIMIT 1`,
      [req.params.id]
    );

    if (studentRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Student not found" });
    }

    const [emailRows] = await connection.execute(
      "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
      [email, req.params.id]
    );
    if (emailRows.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Email is already registered by another user" });
    }

    if (normalizedBatchId) {
      const [batchRows] = await connection.execute(
        "SELECT id FROM batches WHERE id = ? AND (? IS NULL OR standard_id = ?) LIMIT 1",
        [normalizedBatchId, normalizedStandardId, normalizedStandardId]
      );
      if (batchRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({ message: "Selected batch does not belong to the selected class" });
      }
    }

    await connection.execute(
      `UPDATE users
       SET name = ?, email = ?, is_active = ?
       WHERE id = ? AND role = 'student'`,
      [name, email, normalizedIsActive, req.params.id]
    );

    await connection.execute(
      `UPDATE students
       SET name = ?, mobile = ?, parent_name = ?, address = ?,
           standard_id = ?, batch_id = ?, is_active = ?
       WHERE user_id = ?`,
      [
        name,
        mobile || null,
        parentName || null,
        address || null,
        normalizedStandardId,
        normalizedBatchId,
        normalizedIsActive,
        req.params.id
      ]
    );

    await connection.commit();
    res.json({ message: "Student updated successfully" });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: "Error updating student", error: err.message });
  } finally {
    connection.release();
  }
});

router.delete("/students/:id", authMiddleware, isStudentManager, async (req, res) => {
  try {
    const [result] = await pool.execute(
      "DELETE FROM users WHERE id = ? AND role = 'student'",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting student", error: err.message });
  }
});

module.exports = router;
