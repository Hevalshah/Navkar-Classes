const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { pool } = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

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
      SELECT m.*, sub.name AS subject_name, b.name AS batch_name, u.name AS uploader_name 
      FROM materials m
      JOIN subjects sub ON m.subject_id = sub.id
      JOIN batches b ON m.batch_id = b.id
      JOIN users u ON m.uploaded_by = u.id
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
    }

    query += " ORDER BY m.id DESC";
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching materials", error: err.message });
  }
});

// ===============================
// CREATE / UPLOAD MATERIAL
// ===============================
router.post("/", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "staff" && req.user.role !== "teacher") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { title, description, subjectId, batchId } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: "File upload is required" });
    }
    if (!title || !subjectId || !batchId) {
      // Cleanup uploaded file if text params are missing
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Title, Subject and Batch are required" });
    }

    const ext = path.extname(req.file.originalname).toLowerCase().replace(".", "");
    const size = formatBytes(req.file.size);
    const filePath = req.file.filename; // store filename only, dynamic path resolution later

    const [result] = await pool.execute(
      `INSERT INTO materials (title, description, subject_id, batch_id, file_path, file_type, file_size, uploaded_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description || "", subjectId, batchId, filePath, ext, size, req.user.id]
    );

    res.status(201).json({ id: result.insertId, title, message: "Material uploaded successfully" });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Error uploading material", error: err.message });
  }
});

// ===============================
// EDIT MATERIAL DETAILS
// ===============================
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "staff" && req.user.role !== "teacher") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { title, description, subjectId, batchId } = req.body;
    if (!title || !subjectId || !batchId) {
      return res.status(400).json({ message: "Title, Subject and Batch are required" });
    }

    await pool.execute(
      "UPDATE materials SET title = ?, description = ?, subject_id = ?, batch_id = ? WHERE id = ?",
      [title, description || "", subjectId, batchId, req.params.id]
    );

    res.json({ message: "Material updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error updating material", error: err.message });
  }
});

// ===============================
// DELETE MATERIAL
// ===============================
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "staff" && req.user.role !== "teacher") {
      return res.status(403).json({ message: "Access denied" });
    }

    const [rows] = await pool.execute("SELECT file_path FROM materials WHERE id = ?", [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Material not found" });
    }

    const filename = rows[0].file_path;
    const fullPath = path.join(uploadDir, filename);

    // Delete record from DB
    await pool.execute("DELETE FROM materials WHERE id = ?", [req.params.id]);

    // Delete physical file
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    res.json({ message: "Material deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting material", error: err.message });
  }
});

// ===============================
// SERVE / PREVIEW FILE (VIEW ACTION)
// ===============================
router.get("/view/:id", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM materials WHERE id = ?", [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).send("Material not found");
    }

    const material = rows[0];
    const fullPath = path.join(uploadDir, material.file_path);

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
    else if (ext === ".txt") contentType = "text/plain";
    else if (ext === ".html") contentType = "text/html";

    res.setHeader("Content-Type", contentType);
    // For preview, don't force download attachment, serve inline
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(material.title)}${ext}"`);
    
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);
  } catch (err) {
    res.status(500).send("Error serving file: " + err.message);
  }
});

module.exports = router;
