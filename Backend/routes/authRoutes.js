const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

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
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(User.publicUser(user));
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

    const user = await User.findByEmailAndRole(email, role);
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    await User.updateLastLogin(user.id);

    res.json({ token, role: user.role });
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
