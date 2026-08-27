const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Teacher = require("../models/Teacher");
const { issueTokens, verifyRefreshToken } = require("../services/tokenService");

const publicLogin = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const identifier = String(email || "").trim();
    const normalizedRole = String(role || "").toLowerCase();

    if (!["teacher", "student"].includes(normalizedRole)) {
      return res.status(403).json({ message: "This login page is only for teachers and students." });
    }

    let account;
    if (normalizedRole === "teacher") {
      account = await Teacher.findByEmail(identifier);
      if (!account || account.status !== "Active") {
        return res.status(400).json({ message: "Invalid credentials" });
      }
      account = { ...account, role: "teacher", username: account.email };
    } else {
      account = await User.findByEmailAndRole(identifier, "student");
    }

    if (!account) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (normalizedRole === "student") {
      await User.updateLastLogin(account.id);
    }

    res.json({
      ...issueTokens(account),
      role: account.role
    });
  } catch (error) {
    console.error("Public Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const refreshPublicToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!["teacher", "student"].includes(decoded.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    let account;
    if (decoded.role === "teacher") {
      account = await Teacher.findById(decoded.id);
      if (!account || account.status !== "Active") {
        return res.status(401).json({ message: "Account is inactive or unavailable" });
      }
      account = { ...account, role: "teacher", username: account.email };
    } else {
      account = await User.findActiveById(decoded.id);
      if (!account || account.role !== "student") {
        return res.status(401).json({ message: "Account is inactive or unavailable" });
      }
    }

    res.json({
      ...issueTokens(account),
      role: account.role
    });
  } catch {
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

module.exports = {
  publicLogin,
  refreshPublicToken
};
