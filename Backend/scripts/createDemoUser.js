require("dotenv").config();
if (process.env.NODE_ENV === "production") {
  console.error("Demo user creation is disabled in production.");
  process.exit(1);
}
const bcrypt = require("bcryptjs");
const { connectDB, pool } = require("../config/db");
const { logSafeError } = require("../services/safeLogger");
const { validatePassword } = require("../services/passwordPolicy");

const createDemoUser = async () => {
  await connectDB();

  const passwordError = validatePassword(process.env.DEMO_SEED_PASSWORD);
  if (passwordError) throw new Error("Set a strong DEMO_SEED_PASSWORD in the development environment.");
  const password = await bcrypt.hash(process.env.DEMO_SEED_PASSWORD, 10);
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

  console.log("Demo user is ready.");
  await pool.end();
};

createDemoUser().catch((error) => {
  logSafeError("Demo user creation failed", error);
  process.exit(1);
});
