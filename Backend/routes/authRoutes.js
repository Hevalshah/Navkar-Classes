const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Teacher = require("../models/Teacher");
const AuthController = require("../controllers/AuthController");
const authMiddleware = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/authMiddleware");
const { issueTokens } = require("../services/tokenService");
const { pool } = require("../config/db");

const router = express.Router();

// ===============================
// REGISTER ROUTE
// ===============================
router.post("/register", async (req, res) => {
  try {
    const { name, parentName, mobile, email, password } = req.body;

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
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
      role: "student"
    });

    res.status(201).json({ ...issueTokens(user), role: user.role });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ===============================
// REGISTER STUDENT ROUTE (ADMIN ROLE ONLY)
// ===============================
router.post("/register-student", authMiddleware, authorizeRoles("admin"), async (req, res) => {
  try {
    const { name, mobile, email, address, course, assignedBatch, standardId, batchId, totalFee, username, password } = req.body;
    const normalizedTotalFee = Number(totalFee);

    // Validation for required fields
    if (!name || !email || !standardId || !batchId || !password || !Number.isFinite(normalizedTotalFee) || normalizedTotalFee <= 0) {
      return res.status(400).json({ message: "Full Name, Email, Class, Batch, Total Fee, and Temporary Password are required fields" });
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
      await pool.execute("DELETE FROM notification_reads WHERE user_id = ?", [existingEmailUser.id]);
      await pool.execute("DELETE FROM notifications WHERE role = 'student' AND user_id = ?", [existingEmailUser.id]);
      await pool.execute("DELETE FROM users WHERE id = ? AND role = 'student'", [existingEmailUser.id]);
    } else if (existingEmailUser) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    // Validation for duplicate username (if provided)
    if (username) {
      const existingUsernameUser = await User.findByUsername(username);
      if (existingUsernameUser?.role === "student" && !existingUsernameUser.isActive) {
        await pool.execute("DELETE FROM notification_reads WHERE user_id = ?", [existingUsernameUser.id]);
        await pool.execute("DELETE FROM notifications WHERE role = 'student' AND user_id = ?", [existingUsernameUser.id]);
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
      totalFee: normalizedTotalFee,
      standardId: standardId ? parseInt(standardId) : null,
      batchId: batchId ? parseInt(batchId) : null
    });

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

    res.json({ message: "Profile updated successfully", user: User.publicUser(updatedUser) });
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ message: "Server error during profile update", error: error.message });
  }
});

// ===============================
// CHANGE PASSWORD ROUTE
// ===============================
router.put("/change-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    let account;
    if (req.user.role === "teacher") {
      account = await Teacher.findById(req.user.id);
    } else {
      account = await User.findActiveById(req.user.id);
    }

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, account.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    if (req.user.role === "teacher") {
      await Teacher.updatePassword(req.user.id, hashedPassword);
    } else {
      await User.updatePassword(req.user.id, hashedPassword);
    }

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Change Password Error:", error);
    res.status(500).json({ message: "Server error during password update", error: error.message });
  }
});

// ===============================
// GET CURRENT USER ROUTE
// ===============================
router.get("/me", authMiddleware, async (req, res) => {
  try {
    if (req.user.role === "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (req.user.role === "teacher") {
      const teacher = await Teacher.findById(req.user.id);
      if (!teacher) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(Teacher.publicTeacher(teacher));
    } else {
      const user = await User.findActiveById(req.user.id);
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
router.post("/login", AuthController.publicLogin);
router.post("/refresh", AuthController.refreshPublicToken);

// ===============================
// LOGOUT ROUTE
// ===============================
router.post("/logout", authMiddleware, async (req, res) => {
  try {
    if (req.user.role === "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (req.user.role !== "teacher") {
      await User.updateLastLogout(req.user.id);
    }

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
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

  res.json({ message: "Reset link sent to email" });
});

module.exports = router;
