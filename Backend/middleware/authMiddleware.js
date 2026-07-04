const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Teacher = require("../models/Teacher");

const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Authentication token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role === "teacher") {
      const teacher = await Teacher.findById(decoded.id);
      if (!teacher || teacher.status !== "Active") {
        return res.status(401).json({ message: "Account is inactive or unavailable" });
      }
      req.user = { id: teacher.id, role: "teacher", username: decoded.username || teacher.email };
    } else {
      const user = await User.findActiveById(decoded.id);
      if (!user) return res.status(401).json({ message: "Account is inactive or unavailable" });
      req.user = { id: user.id, role: user.role, username: decoded.username || user.username || user.email };
    }
    
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Please authenticate" });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  next();
};

module.exports = authenticateJWT;
module.exports.authenticateJWT = authenticateJWT;
module.exports.authorizeRoles = authorizeRoles;
