require("dotenv").config();
const bcrypt = require("bcryptjs");
const { connectDB, pool } = require("../config/db");

const createDemoUser = async () => {
  await connectDB();

  const password = await bcrypt.hash("password123", 10);
  await pool.execute(
    `INSERT INTO users (name, parent_name, mobile, email, password, role)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       parent_name = VALUES(parent_name),
       mobile = VALUES(mobile),
       password = VALUES(password),
       role = VALUES(role)`,
    ["Demo Student", "Demo Parent", "9999999999", "student@test.com", password, "student"]
  );

  console.log("Ready: student@test.com / password123");
  await pool.end();
};

createDemoUser().catch((error) => {
  console.error("Failed to create demo user:", error.message);
  process.exit(1);
});
