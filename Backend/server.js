require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { connectDB } = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

// Serve static uploads folder (in case of direct download requests)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Hook Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/materials", require("./routes/materialRoutes"));
app.use("/api/tests", require("./routes/testRoutes"));
app.use("/api/timetable", require("./routes/timetableRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/fees", require("./routes/feeRoutes"));

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
