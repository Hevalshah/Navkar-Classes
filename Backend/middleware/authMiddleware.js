const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Teacher = require("../models/Teacher");

module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role === "teacher") {
      const teacher = await Teacher.findById(decoded.id);
      if (!teacher || teacher.status !== "Active") {
        return res.status(401).json({ message: "Account is inactive or unavailable" });
      }
      req.user = { id: teacher.id, role: "teacher" };
    } else {
      const user = await User.findActiveById(decoded.id);
      if (!user) return res.status(401).json({ message: "Account is inactive or unavailable" });
      req.user = { id: user.id, role: user.role };
    }
    
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};
