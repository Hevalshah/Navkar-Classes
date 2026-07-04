const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { issueTokens, verifyRefreshToken } = require("../services/tokenService");

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await User.findByEmailAndRole(email, "admin");
    if (!admin) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    await User.updateLastLogin(admin.id);

    res.json({
      ...issueTokens(admin),
      role: "admin"
    });
  } catch (error) {
    console.error("Admin Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const adminLogout = async (req, res) => {
  try {
    await User.updateLastLogout(req.user.id);
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Admin Logout Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const adminProfile = async (req, res) => {
  const admin = await User.findActiveById(req.user.id);
  if (!admin || admin.role !== "admin") {
    return res.status(404).json({ message: "Admin not found" });
  }

  res.json(User.publicUser(admin));
};

const adminVerify = async (req, res) => {
  res.json({
    authenticated: true,
    user: {
      id: req.user.id,
      role: req.user.role,
      username: req.user.username
    }
  });
};

const adminRefresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const admin = await User.findActiveById(decoded.id);
    if (!admin || admin.role !== "admin") {
      return res.status(401).json({ message: "Account is inactive or unavailable" });
    }

    res.json({
      ...issueTokens(admin),
      role: "admin"
    });
  } catch {
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

module.exports = {
  adminLogin,
  adminLogout,
  adminProfile,
  adminVerify,
  adminRefresh
};
