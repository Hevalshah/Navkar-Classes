const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Teacher = require("../models/Teacher");
const authMiddleware = require("../middleware/authMiddleware");
const { pool } = require("../config/db");

const router = express.Router();

const isStaffUser = (req, res, next) => {
  if (req.user && (req.user.role === "staff" || req.user.role === "admin")) {
    return next();
  }
  res.status(403).json({ message: "Access denied. Staff only." });
};

// ===============================
// REGISTER ROUTE
// ===============================
router.post("/register", async (req, res) => {
  try {
    const { name, parentName, mobile, email, password, role } = req.body;
    console.log("Register Request:", { name, email, role });

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      console.log("User already exists:", email);
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      parentName,
      mobile,
      email,
      password: hashedPassword,
      role: role || "student"
    });

    console.log("User created successfully:", user.id);

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({ token, role: user.role });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ===============================
// REGISTER STUDENT ROUTE (STAFF ROLE ONLY)
// ===============================
router.post("/register-student", authMiddleware, isStaffUser, async (req, res) => {
  try {
    const { name, mobile, email, address, course, assignedBatch, standardId, batchId, username, password } = req.body;
    console.log("Register Student Request:", { name, email });

    // Validation for required fields
    if (!name || !email || !standardId || !batchId || !password) {
      return res.status(400).json({ message: "Full Name, Email, Class, Batch, and Temporary Password are required fields" });
    }

    const [batchRows] = await pool.execute(
      "SELECT id, name FROM batches WHERE id = ? AND standard_id = ? LIMIT 1",
      [batchId, standardId]
    );
    if (batchRows.length === 0) {
      return res.status(400).json({ message: "Selected batch does not belong to the selected class" });
    }

    // Validation for duplicate email. If the same student was removed earlier,
    // clear the inactive login row so the email can be enrolled again.
    const existingEmailUser = await User.findByEmail(email);
    if (existingEmailUser?.role === "student" && !existingEmailUser.isActive) {
      await pool.execute("DELETE FROM users WHERE id = ? AND role = 'student'", [existingEmailUser.id]);
    } else if (existingEmailUser) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    // Validation for duplicate username (if provided)
    if (username) {
      const existingUsernameUser = await User.findByUsername(username);
      if (existingUsernameUser?.role === "student" && !existingUsernameUser.isActive) {
        await pool.execute("DELETE FROM users WHERE id = ? AND role = 'student'", [existingUsernameUser.id]);
      } else if (existingUsernameUser) {
        return res.status(400).json({ message: "Username is already taken" });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      mobile: mobile || null,
      email,
      username: username || null,
      password: hashedPassword,
      role: "student",
      address: address || null,
      course: course || null,
      assignedBatch: assignedBatch || batchRows[0].name,
      standardId: standardId ? parseInt(standardId) : null,
      batchId: batchId ? parseInt(batchId) : null
    });

    console.log("Student registered successfully:", user.id);
    res.status(201).json({ message: "Student registered successfully", userId: user.id });
  } catch (error) {
    console.error("Student Registration Error:", error);
    res.status(500).json({ message: "Server error during student registration", error: error.message });
  }
});

// ===============================
// UPDATE PROFILE ROUTE
// ===============================
router.put("/update-profile", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, mobile, parentName, email, address, username } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Full Name and Email are required fields" });
    }

    // Validation for duplicate email
    if (email) {
      const existingEmail = await User.findByEmail(email);
      if (existingEmail && existingEmail.id !== userId) {
        return res.status(400).json({ message: "Email is already registered by another user" });
      }
    }

    // Validation for duplicate username (if provided)
    if (username) {
      const existingUsername = await User.findByUsername(username);
      if (existingUsername && existingUsername.id !== userId) {
        return res.status(400).json({ message: "Username is already taken" });
      }
    }

    const updatedUser = await User.updateProfile(userId, {
      name,
      mobile,
      parentName,
      email,
      address,
      username
    });

    console.log("Profile updated successfully for user ID:", userId);
    res.json({ message: "Profile updated successfully", user: User.publicUser(updatedUser) });
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ message: "Server error during profile update", error: error.message });
  }
});

// ===============================
// GET CURRENT USER ROUTE
// ===============================
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res.status(401).json({ message: "Please authenticate" });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role === "teacher") {
      const teacher = await Teacher.findById(decoded.id);
      if (!teacher) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(Teacher.publicTeacher(teacher));
    } else {
      const user = await User.findActiveById(decoded.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(User.publicUser(user));
    }
  } catch (error) {
    res.status(401).json({ message: "Please authenticate" });
  }
});

// ===============================
// LOGIN ROUTE
// ===============================
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    let user;
    if (role === "teacher") {
      user = await Teacher.findByEmail(email);
      if (!user || user.status !== "Active") {
        return res.status(400).json({ message: "Invalid credentials" });
      }
    } else {
      user = await User.findByEmailAndRole(email, role);
    }

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role || "teacher" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    if (role !== "teacher") {
      await User.updateLastLogin(user.id);
    }

    res.json({ token, role: user.role || "teacher" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ===============================
// LOGOUT ROUTE
// ===============================
router.post("/logout", async (req, res) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res.status(401).json({ message: "Please authenticate" });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await User.updateLastLogout(decoded.id);

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(401).json({ message: "Please authenticate" });
  }
});

// ===============================
// FORGOT PASSWORD (BASIC)
// ===============================
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  const user = await User.findByEmail(email);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  console.log(`Password reset requested for: ${email}`);

  res.json({ message: "Reset link sent to email" });
});

module.exports = router;
