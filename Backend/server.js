require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { connectDB } = require("./config/db");
const { xssProtection, errorMiddleware } = require("./middleware/securityMiddleware");

// Environment variable validation
const requiredEnv = ["PORT", "JWT_SECRET", "DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
requiredEnv.forEach((env) => {
  if (!process.env[env]) {
    console.warn(`[Warning] Required environment variable "${env}" is missing.`);
  }
});

const app = express();

// Security Headers
app.use(helmet());

// General API Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." }
});
app.use("/api/", apiLimiter);

// Strict Rate Limiting for Contact Form / Payment Creation to prevent spam
const spamLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 10,
  message: { message: "Rate limit exceeded. Please try again after 15 minutes." }
});
app.use("/api/contact", spamLimiter);
app.use("/api/payments/create-order", spamLimiter);

app.use(cors());
app.use(express.json());

// XSS protection
app.use(xssProtection);

// Serve static uploads folder (in case of direct download requests)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Hook Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/admin", require("./routes/adminAuthRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/materials", require("./routes/materialRoutes"));
app.use("/api/tests", require("./routes/testRoutes"));
app.use("/api/timetable", require("./routes/timetableRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/fees", require("./routes/feeRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/contact", require("./routes/contactRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));

// Global error handler
app.use(errorMiddleware);

const startServer = async () => {
  await connectDB();

  app.listen(process.env.PORT, () =>
    console.log(`Server running on port ${process.env.PORT}`)
  );
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
