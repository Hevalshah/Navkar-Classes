const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { pool } = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// Setup upload folder for tests
const uploadDir = path.join(__dirname, "../uploads/tests");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// ===============================
// GET TESTS
// ===============================
router.get("/", authMiddleware, async (req, res) => {
  try {
    let query = `
      SELECT t.*, sub.name AS subject_name, b.name AS batch_name, u.name AS creator_name 
      FROM tests t
      JOIN subjects sub ON t.subject_id = sub.id
      JOIN batches b ON t.batch_id = b.id
      JOIN users u ON t.created_by = u.id
    `;
    const params = [];

    if (req.user.role === "student") {
      const [userRows] = await pool.execute("SELECT batch_id FROM students WHERE user_id = ?", [req.user.id]);
      if (userRows[0] && userRows[0].batch_id) {
        query += " WHERE t.batch_id = ?";
        params.push(userRows[0].batch_id);
      } else {
        return res.json([]);
      }
    }

    query += " ORDER BY t.test_date DESC, t.id DESC";
    const [testRows] = await pool.execute(query, params);

    // Fetch user submission results if student, or all submissions if admin
    if (req.user.role === "student") {
      const [subRows] = await pool.execute("SELECT * FROM test_submissions WHERE student_id = ?", [req.user.id]);
      const subMap = {};
      subRows.forEach((s) => {
        subMap[s.test_id] = s;
      });

      const testsWithSub = testRows.map((t) => {
        const sub = subMap[t.id];
        return {
          ...t,
          submissionStatus: sub ? sub.status : "Pending",
          score: sub ? sub.score : "N/A"
        };
      });
      return res.json(testsWithSub);
    } else {
      // Admin: we will return all test records
      res.json(testRows);
    }
  } catch (err) {
    res.status(500).json({ message: "Error fetching tests", error: err.message });
  }
});

// ===============================
// CREATE / UPLOAD TEST
// ===============================
router.post("/", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { title, subjectId, batchId, instructions, totalMarks, testDate } = req.body;
    if (!title || !subjectId || !batchId || !totalMarks || !testDate) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Title, Subject, Batch, Total Marks, and Date are required" });
    }

    const filePath = req.file ? req.file.filename : null;

    const [result] = await pool.execute(
      `INSERT INTO tests (title, subject_id, batch_id, instructions, total_marks, file_path, created_by, test_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, subjectId, batchId, instructions || "", totalMarks, filePath, req.user.id, testDate]
    );

    res.status(201).json({ id: result.insertId, title, message: "Test created successfully" });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Error creating test", error: err.message });
  }
});

// ===============================
// SERVE TEST FILE (VIEW FILE ACTION)
// ===============================
router.get("/view/:id", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM tests WHERE id = ?", [req.params.id]);
    if (rows.length === 0 || !rows[0].file_path) {
      return res.status(404).send("Test file not found");
    }

    const test = rows[0];
    const fullPath = path.join(uploadDir, test.file_path);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).send("File does not exist on storage server");
    }

    let contentType = "application/octet-stream";
    const ext = path.extname(test.file_path).toLowerCase();
    if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(test.title)}${ext}"`);

    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);
  } catch (err) {
    res.status(500).send("Error serving test file: " + err.message);
  }
});

// ===============================
// DELETE TEST
// ===============================
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    const [rows] = await pool.execute("SELECT file_path FROM tests WHERE id = ?", [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Test not found" });
    }

    const filename = rows[0].file_path;
    await pool.execute("DELETE FROM tests WHERE id = ?", [req.params.id]);

    if (filename) {
      const fullPath = path.join(uploadDir, filename);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    res.json({ message: "Test deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting test", error: err.message });
  }
});

// ===============================
// GET SUBMISSIONS FOR A TEST (ADMIN ONLY)
// ===============================
router.get("/:id/submissions", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    const [testRows] = await pool.execute("SELECT batch_id FROM tests WHERE id = ?", [req.params.id]);
    if (testRows.length === 0) return res.status(404).json({ message: "Test not found" });

    const batchId = testRows[0].batch_id;

    // Fetch all students in this test's batch
    const [students] = await pool.execute(
      `SELECT u.id, st.name, u.email
       FROM students st
       JOIN users u ON st.user_id = u.id
       WHERE u.role = 'student' AND u.is_active = TRUE AND st.is_active = TRUE AND st.batch_id = ?`,
      [batchId]
    );

    // Fetch submissions for this test
    const [submissions] = await pool.execute(
      "SELECT * FROM test_submissions WHERE test_id = ?",
      [req.params.id]
    );

    const subMap = {};
    submissions.forEach((s) => {
      subMap[s.student_id] = s;
    });

    const studentSubmissions = students.map((std) => {
      const sub = subMap[std.id];
      return {
        studentId: std.id,
        studentName: std.name,
        email: std.email,
        score: sub ? sub.score : "",
        status: sub ? sub.status : "Pending",
        submittedDate: sub ? sub.submitted_date : null
      };
    });

    res.json(studentSubmissions);
  } catch (err) {
    res.status(500).json({ message: "Error fetching submissions", error: err.message });
  }
});

// ===============================
// GRADE / UPDATE SCORE (ADMIN ONLY)
// ===============================
router.post("/grade", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { testId, studentId, score, status } = req.body;
    if (!testId || !studentId || score === undefined) {
      return res.status(400).json({ message: "Test ID, Student ID, and Score are required" });
    }

    // Check if submission already exists
    const [exist] = await pool.execute(
      "SELECT id FROM test_submissions WHERE test_id = ? AND student_id = ?",
      [testId, studentId]
    );

    if (exist.length > 0) {
      await pool.execute(
        "UPDATE test_submissions SET score = ?, status = ?, submitted_date = NOW() WHERE test_id = ? AND student_id = ?",
        [score, status || "Graded", testId, studentId]
      );
    } else {
      await pool.execute(
        "INSERT INTO test_submissions (test_id, student_id, score, status, submitted_date) VALUES (?, ?, ?, ?, NOW())",
        [testId, studentId, score, status || "Graded"]
      );
    }

    res.json({ message: "Submission graded successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error grading submission", error: err.message });
  }
});

module.exports = router;
