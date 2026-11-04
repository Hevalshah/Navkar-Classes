const express = require("express");
const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const { createUpload, verifyUploadedFile } = require("../middleware/uploadValidation");
const { pool } = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/authMiddleware");
const { insertNotification } = require("./notificationRoutes");
const { resolveTeacher } = require("../services/teacherAccess");

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const materialExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".txt", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"];
const upload = createUpload({ destination: uploadDir, extensions: materialExtensions, maxBytes: 20 * 1024 * 1024 });

// Helper for format size
const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// ===============================
// GET MATERIALS
// ===============================
router.get("/", authMiddleware, async (req, res) => {
  try {
    let query = `
      SELECT m.*, sub.name AS subject_name, b.name AS batch_name, COALESCE(tch.name, u.name) AS uploader_name
      FROM materials m
      JOIN subjects sub ON m.subject_id = sub.id
      JOIN batches b ON m.batch_id = b.id
      LEFT JOIN users u ON m.uploaded_by = u.id
      LEFT JOIN teachers tch ON m.uploaded_by_teacher_id = tch.id
    `;
    const params = [];

    // Filter by student's batch if user role is student
    if (req.user.role === "student") {
      // Find student batch_id
      const [userRows] = await pool.execute("SELECT batch_id FROM students WHERE user_id = ?", [req.user.id]);
      if (userRows[0] && userRows[0].batch_id) {
        query += " WHERE m.batch_id = ?";
        params.push(userRows[0].batch_id);
      } else {
        return res.json([]); // Student has no batch assigned
      }
    } else if (req.user.role === "teacher") {
      const teacher = await resolveTeacher(pool, req.user);
      if (!teacher) return res.status(403).json({ message: "Forbidden" });
      // Active teachers have global teaching access across batches.
    }

    query += " ORDER BY m.id ASC";
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching materials" });
  }
});

// ===============================
// CREATE / UPLOAD MATERIAL
// ===============================
router.post("/", authMiddleware, authorizeRoles("admin", "teacher"), upload.single("file"), verifyUploadedFile(materialExtensions), async (req, res) => {
  try {
    const { title, description, subjectId, batchId } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: "File upload is required" });
    }
    if (!title || !subjectId || !batchId) {
      // Cleanup uploaded file if text params are missing
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Title, Subject and Batch are required" });
    }

    let uploaderId = req.user.role === "admin" ? req.user.id : null;
    let uploaderTeacherId = null;
    if (req.user.role === "teacher") {
      const teacher = await resolveTeacher(pool, req.user);
      if (!teacher) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: "Forbidden" });
      }
      uploaderTeacherId = teacher.id;
    }

    const ext = path.extname(req.file.originalname).toLowerCase().replace(".", "");
    const size = formatBytes(req.file.size);
    const filePath = req.file.filename; // store filename only, dynamic path resolution later

    const [result] = await pool.execute(
      `INSERT INTO materials (title, description, subject_id, batch_id, file_path, file_type, file_size, uploaded_by, uploaded_by_teacher_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description || "", subjectId, batchId, filePath, ext, size, uploaderId, uploaderTeacherId]
    );

    const materialId = result.insertId;

    // Fetch uploader name (works for both users and teachers tables)
    let uploaderName = "Teacher";
    try {
      if (req.user.role === "teacher") uploaderName = (await resolveTeacher(pool, req.user))?.name || uploaderName;
      else {
        const [[u]] = await pool.execute("SELECT name FROM users WHERE id = ? LIMIT 1", [req.user.id]);
        if (u) uploaderName = u.name;
      }
    } catch (_) {}

    // Fetch subject name
    let subjectName = "";
    try {
      const [[sub]] = await pool.execute("SELECT name FROM subjects WHERE id = ? LIMIT 1", [subjectId]);
      if (sub) subjectName = sub.name;
    } catch (_) {}

    // Notify every student in the batch
    try {
      const [batchStudents] = await pool.execute(
        `SELECT st.user_id FROM students st
         JOIN users u ON st.user_id = u.id
         WHERE st.batch_id = ? AND st.is_active = TRUE AND u.is_active = TRUE`,
        [batchId]
      );
      for (const s of batchStudents) {
        await insertNotification({
          title:   `New Material Uploaded`,
          message: `${uploaderName} uploaded ${title}.`,
          type:    "material",
          role:    "student",
          userId:  s.user_id,
          referenceId: materialId,
          uniqueKey: `student:${s.user_id}:material:${materialId}`
        });
      }
    } catch (_) {}

    // Notify admin
    await insertNotification({
      title:   "New Material Uploaded",
      message: `${uploaderName} uploaded ${title}${subjectName ? ` (${subjectName})` : ""}.`,
      type:    "material",
      role:    "admin",
      referenceId: materialId,
      uniqueKey: `admin:material:${materialId}`
    });

    // Notify staff
    await insertNotification({
      title:   "New Material Uploaded",
      message: `${uploaderName} uploaded ${title}${subjectName ? ` (${subjectName})` : ""}.`,
      type:    "material",
      role:    "staff",
      referenceId: materialId,
      uniqueKey: `staff:material:${materialId}`
    });

    res.status(201).json({ id: materialId, title, message: "Material uploaded successfully" });

  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Error uploading material" });
  }
});

// ===============================
// EDIT MATERIAL DETAILS
// ===============================
router.put("/:id", authMiddleware, authorizeRoles("admin", "teacher"), async (req, res) => {
  try {
    const { title, description, subjectId, batchId } = req.body;
    if (!title || !subjectId || !batchId) {
      return res.status(400).json({ message: "Title, Subject and Batch are required" });
    }

    if (req.user.role === "teacher") {
      const [[material]] = await pool.execute("SELECT batch_id, uploaded_by FROM materials WHERE id = ?", [req.params.id]);
      if (!material || !(await canViewMaterial(req.user, material))) return res.status(403).json({ message: "Forbidden" });
      if (!(await resolveTeacher(pool, req.user))) return res.status(403).json({ message: "Forbidden" });
    }

    await pool.execute(
      "UPDATE materials SET title = ?, description = ?, subject_id = ?, batch_id = ? WHERE id = ?",
      [title, description || "", subjectId, batchId, req.params.id]
    );

    res.json({ message: "Material updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error updating material" });
  }
});

// ===============================
// DELETE MATERIAL
// ===============================
router.delete("/:id", authMiddleware, authorizeRoles("admin", "teacher"), async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT file_path, batch_id, uploaded_by FROM materials WHERE id = ?", [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Material not found" });
    }

    const filename = rows[0].file_path;
    if (req.user.role === "teacher" && !(await canViewMaterial(req.user, rows[0]))) return res.status(403).json({ message: "Forbidden" });
    const fullPath = path.join(uploadDir, filename);

    // Delete record from DB
    await pool.execute("DELETE FROM materials WHERE id = ?", [req.params.id]);

    // Delete physical file
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    res.json({ message: "Material deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting material" });
  }
});

// ===============================
// SERVE / PREVIEW FILE (VIEW ACTION)
// ===============================
router.get("/view/:id", authMiddleware, async (req, res, next) => {
  try {
    const [rows] = await pool.execute("SELECT id, title, file_path, batch_id, uploaded_by FROM materials WHERE id = ?", [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).send("Material not found");
    }

    const material = rows[0];
    if (!(await canViewMaterial(req.user, material))) return res.status(403).json({ message: "Forbidden" });
    const filename = path.basename(material.file_path || "");
    if (!filename || filename !== material.file_path) return res.status(404).json({ message: "File not found" });
    const fullPath = path.join(uploadDir, filename);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).send("File does not exist on storage server");
    }

    // Determine content type
    let contentType = "application/octet-stream";
    const ext = path.extname(material.file_path).toLowerCase();
    if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".gif") contentType = "image/gif";
    else if (ext === ".gif") contentType = "image/gif";
    else if (ext === ".txt") contentType = "text/plain; charset=utf-8";

    res.setHeader("Content-Type", contentType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    // For preview, don't force download attachment, serve inline
    const disposition = [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".txt"].includes(ext) ? "inline" : "attachment";
    res.setHeader("Content-Disposition", `${disposition}; filename="${encodeURIComponent(material.title)}${ext}"`);
    
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);
  } catch (err) {
    next(err);
  }
});

const canViewMaterial = async (user, material) => {
  if (["admin", "staff"].includes(user.role)) return true;
  if (user.role === "student") {
    const [[student]] = await pool.execute("SELECT batch_id FROM students WHERE user_id = ? LIMIT 1", [user.id]);
    return Boolean(student && Number(student.batch_id) === Number(material.batch_id));
  }
  if (user.role === "teacher") {
    return Boolean(await resolveTeacher(pool, user));
  }
  return false;
};

module.exports = router;
