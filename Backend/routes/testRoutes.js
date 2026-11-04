const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { createUpload, verifyUploadedFile } = require("../middleware/uploadValidation");
const { pool } = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/authMiddleware");
const { insertNotification } = require("./notificationRoutes");
const { resolveTeacher } = require("../services/teacherAccess");
const uploadDir = path.join(__dirname, "../uploads/tests");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const testExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"];
const upload = createUpload({ destination: uploadDir, extensions: testExtensions, maxBytes: 20 * 1024 * 1024 });

// ===============================
// GET TESTS
// ===============================
router.get("/", authMiddleware, async (req, res) => {
  try {
    let query = `
      SELECT t.*, sub.name AS subject_name, b.name AS batch_name, COALESCE(owner.name, u.name) AS creator_name
      FROM tests t
      JOIN subjects sub ON t.subject_id = sub.id
      JOIN batches b ON t.batch_id = b.id
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN teachers owner ON t.created_by_teacher_id = owner.id
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
    } else if (req.user.role === "teacher") {
      const teacher = await resolveTeacher(pool, req.user);
      if (!teacher) return res.status(403).json({ message: "Forbidden" });
      // Active teachers can view assessments across all batches.
    }

    query += " ORDER BY t.id ASC";
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
    res.status(500).json({ message: "Error fetching tests" });
  }
});

// ===============================
// CREATE / UPLOAD TEST
// ===============================
router.post("/", authMiddleware, authorizeRoles("admin", "teacher"), upload.single("file"), verifyUploadedFile(testExtensions), async (req, res) => {
  try {
    const { title, subjectId, batchId, instructions, totalMarks, testDate } = req.body;
    if (!title || !subjectId || !batchId || !totalMarks || !testDate) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Title, Subject, Batch, Total Marks, and Date are required" });
    }

    let creatorId = req.user.role === "admin" ? req.user.id : null;
    let creatorTeacherId = null;
    if (req.user.role === "teacher") {
      const teacher = await resolveTeacher(pool, req.user);
      if (!teacher) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: "Forbidden" });
      }
      creatorTeacherId = teacher.id;
    }

    const filePath = req.file ? req.file.filename : null;

    const [result] = await pool.execute(
      `INSERT INTO tests (title, subject_id, batch_id, instructions, total_marks, file_path, created_by, created_by_teacher_id, test_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, subjectId, batchId, instructions || "", totalMarks, filePath, creatorId, creatorTeacherId, testDate]
    );

    const testId = result.insertId;
    const ts = Date.now();
    const formattedDate = new Date(testDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

    // Fetch subject name
    let subjectName = "Subject";
    try {
      const [[sub]] = await pool.execute("SELECT name FROM subjects WHERE id = ? LIMIT 1", [subjectId]);
      if (sub) subjectName = sub.name;
    } catch (_) {}

    // Notify all students in the batch
    try {
      const [batchStudents] = await pool.execute(
        `SELECT st.user_id FROM students st
         JOIN users u ON st.user_id = u.id
         WHERE st.batch_id = ? AND st.is_active = TRUE AND u.is_active = TRUE`,
        [batchId]
      );
      for (const s of batchStudents) {
        await insertNotification({
          title: `New test scheduled: ${title} on ${formattedDate}`,
          message: `A ${subjectName} test "${title}" has been scheduled for ${formattedDate}.`,
          type: "test",
          role: "student",
          userId: s.user_id,
          referenceId: testId,
          uniqueKey: `student:${s.user_id}:test:${testId}:${ts}`
        });
      }
    } catch (_) {}

    // Notify admin
    await insertNotification({
      title: `Test created: ${title} (${subjectName}) on ${formattedDate}`,
      message: `Test "${title}" for ${subjectName} scheduled on ${formattedDate}.`,
      type: "test",
      role: "admin",
      referenceId: testId,
      uniqueKey: `admin:test:${testId}:${ts}`
    });

    res.status(201).json({ id: testId, title, message: "Test created successfully" });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Error creating test" });
  }
});

// ===============================
// SERVE TEST FILE (VIEW FILE ACTION)
// ===============================
router.get("/view/:id", authMiddleware, async (req, res, next) => {
  try {
    const [rows] = await pool.execute("SELECT id, title, file_path, batch_id, created_by, created_by_teacher_id FROM tests WHERE id = ?", [req.params.id]);
    if (rows.length === 0 || !rows[0].file_path) {
      return res.status(404).send("Test file not found");
    }

    const test = rows[0];
    if (!(await canViewTest(req.user, test))) return res.status(403).json({ message: "Forbidden" });
    const filename = path.basename(test.file_path || "");
    if (!filename || filename !== test.file_path) return res.status(404).json({ message: "Test file not found" });
    const fullPath = path.join(uploadDir, filename);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).send("File does not exist on storage server");
    }

    let contentType = "application/octet-stream";
    const ext = path.extname(test.file_path).toLowerCase();
    if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";

    res.setHeader("Content-Type", contentType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    const disposition = [".pdf", ".png", ".jpg", ".jpeg"].includes(ext) ? "inline" : "attachment";
    res.setHeader("Content-Disposition", `${disposition}; filename="${encodeURIComponent(test.title)}${ext}"`);

    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);
  } catch (err) {
    next(err);
  }
});

const canViewTest = async (user, test) => {
  if (["admin", "staff"].includes(user.role)) return true;
  if (user.role === "student") {
    const [[student]] = await pool.execute("SELECT batch_id FROM students WHERE user_id = ? LIMIT 1", [user.id]);
    return Boolean(student && Number(student.batch_id) === Number(test.batch_id));
  }
  if (user.role === "teacher") {
    return Boolean(await resolveTeacher(pool, user));
  }
  return false;
};

// ===============================
// DELETE TEST
// ===============================
router.delete("/:id", authMiddleware, authorizeRoles("admin", "teacher"), async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT file_path, batch_id, created_by, created_by_teacher_id FROM tests WHERE id = ?", [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Test not found" });
    }

    if (req.user.role === "teacher" && !(await canViewTest(req.user, rows[0]))) return res.status(403).json({ message: "Forbidden" });

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
    res.status(500).json({ message: "Error deleting test" });
  }
});

router.put("/:id", authMiddleware, authorizeRoles("admin", "teacher"), upload.single("file"), verifyUploadedFile(testExtensions), async (req, res) => {
  try {
    const { title, subjectId, batchId, instructions, totalMarks, testDate } = req.body;
    if (!title || !subjectId || !batchId || !Number.isInteger(Number(totalMarks)) || Number(totalMarks) < 1 || !testDate || Number.isNaN(Date.parse(testDate))) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Test details are invalid" });
    }
    if (req.user.role === "teacher" && !(await resolveTeacher(pool, req.user))) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: "Forbidden" });
    }
    const [[existing]] = await pool.execute("SELECT file_path, subject_id, batch_id, total_marks FROM tests WHERE id = ?", [req.params.id]);
    if (!existing) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Test not found" });
    }
    const [[submissionCount]] = await pool.execute("SELECT COUNT(*) AS total FROM test_submissions WHERE test_id = ?", [req.params.id]);
    if (Number(submissionCount.total) > 0 && (
      Number(existing.subject_id) !== Number(subjectId) ||
      Number(existing.batch_id) !== Number(batchId) ||
      Number(existing.total_marks) !== Number(totalMarks)
    )) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(409).json({ message: "Cannot change test subject, batch, or total marks after submissions exist" });
    }
    const filePath = req.file ? req.file.filename : existing.file_path;
    await pool.execute(
      "UPDATE tests SET title = ?, subject_id = ?, batch_id = ?, instructions = ?, total_marks = ?, test_date = ?, file_path = ? WHERE id = ?",
      [title, subjectId, batchId, instructions || "", Number(totalMarks), testDate, filePath, req.params.id]
    );
    if (req.file && existing.file_path) {
      const oldPath = path.join(uploadDir, path.basename(existing.file_path));
      if (oldPath !== req.file.path && fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    res.json({ message: "Test updated successfully" });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: "Error updating test" });
  }
});

// ===============================
// GET SUBMISSIONS FOR A TEST (ADMIN OR ACTIVE TEACHER)
// ===============================
router.get("/:id/submissions", authMiddleware, authorizeRoles("admin", "teacher"), async (req, res) => {
  try {
    const [testRows] = await pool.execute("SELECT batch_id FROM tests WHERE id = ?", [req.params.id]);
    if (testRows.length === 0) return res.status(404).json({ message: "Test not found" });

    const batchId = testRows[0].batch_id;
    if (req.user.role === "teacher" && !(await resolveTeacher(pool, req.user))) return res.status(403).json({ message: "Forbidden" });

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
    res.status(500).json({ message: "Error fetching submissions" });
  }
});

// ===============================
// GRADE / UPDATE SCORE (ADMIN OR ACTIVE TEACHER)
// ===============================
router.post("/grade", authMiddleware, authorizeRoles("admin", "teacher"), async (req, res) => {
  try {
    const { testId, studentId, score, status } = req.body;
    if (!testId || !studentId || score === undefined) {
      return res.status(400).json({ message: "Test ID, Student ID, and Score are required" });
    }

    const [[test]] = await pool.execute("SELECT total_marks, batch_id FROM tests WHERE id = ? LIMIT 1", [testId]);
    if (!test) return res.status(404).json({ message: "Test not found" });
    const scoreText = String(score).trim();
    const numericScore = Number(scoreText);
    if (!/^(?:\d+\.?\d*|\.\d+)$/.test(scoreText) || scoreText.length > 50 || !Number.isFinite(numericScore) || numericScore < 0 || numericScore > Number(test.total_marks)) {
      return res.status(400).json({ message: "Score must be a number within the test's mark range." });
    }
    if (status !== undefined && !["Graded", "Ungraded"].includes(status)) {
      return res.status(400).json({ message: "Invalid submission status." });
    }
    if (req.user.role === "teacher") {
      if (!(await resolveTeacher(pool, req.user))) return res.status(403).json({ message: "Forbidden" });
    }
    const [[student]] = await pool.execute("SELECT batch_id FROM students WHERE user_id = ? LIMIT 1", [studentId]);
    if (!student || Number(student.batch_id) !== Number(test.batch_id)) {
      return res.status(400).json({ message: "Student is not assigned to this test's batch." });
    }

    // Check if submission already exists
    const [exist] = await pool.execute(
      "SELECT id FROM test_submissions WHERE test_id = ? AND student_id = ?",
      [testId, studentId]
    );

    if (exist.length > 0) {
      await pool.execute(
        "UPDATE test_submissions SET score = ?, status = ?, submitted_date = NOW() WHERE test_id = ? AND student_id = ?",
        [numericScore, status || "Graded", testId, studentId]
      );
    } else {
      await pool.execute(
        "INSERT INTO test_submissions (test_id, student_id, score, status, submitted_date) VALUES (?, ?, ?, ?, NOW())",
        [testId, studentId, numericScore, status || "Graded"]
      );
    }

    // Notify student about their result
    try {
      const finalStatus = status || "Graded";
      let testTitle = "Test";
      const [[testRow]] = await pool.execute("SELECT title, total_marks FROM tests WHERE id = ? LIMIT 1", [testId]);
      if (testRow) testTitle = testRow.title;
      const totalMarks = testRow ? testRow.total_marks : "?";

      await insertNotification({
        title: `Result declared: ${testTitle} — Score: ${score}/${totalMarks}`,
        message: `Your result for "${testTitle}" has been declared. You scored ${score} out of ${totalMarks}. Status: ${finalStatus}.`,
        type: "test",
        role: "student",
        userId: studentId,
        referenceId: testId,
        uniqueKey: `student:${studentId}:result:${testId}:${Date.now()}`
      });
    } catch (_) {}

    res.json({ message: "Submission graded successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error grading submission" });
  }
});

module.exports = router;
