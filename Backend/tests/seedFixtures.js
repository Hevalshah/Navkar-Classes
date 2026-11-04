require("dotenv").config({ path: require("path").join(__dirname, ".env.test") });
const bcrypt = require("bcryptjs");
const { withTestConnection } = require("./database");

const seedFixtures = async () => withTestConnection(async ({ connection, read, write }) => {
  const [[identity]] = await read("SELECT DATABASE() AS database_name");
  if (identity.database_name !== "navkar_classes_test") throw new Error("Fixture seed refused outside test database.");
  const tables = ["users", "teachers", "standards", "batches", "subjects", "students", "timetable", "payments"];
  for (const table of tables) {
    const [[row]] = await read(`SELECT COUNT(*) AS count FROM ${table}`);
    if (Number(row.count) !== 0) throw new Error(`Refusing to seed non-empty fixture table: ${table}`);
  }

  await connection.beginTransaction();
  try {
    const password = await bcrypt.hash("NavkarTest123!", 10);
    const [standard] = await write("INSERT INTO standards (name) VALUES (?)", ["Synthetic Standard"]);
    const [batch] = await write("INSERT INTO batches (name, standard_id) VALUES (?, ?)", ["Synthetic Batch", standard.insertId]);
    const [subject] = await write("INSERT INTO subjects (name, standard_id) VALUES (?, ?)", ["Synthetic Subject", standard.insertId]);
    const [admin] = await write(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')",
      ["Synthetic Admin", "admin.test@example.invalid", password]
    );
    const [student] = await write(
      "INSERT INTO users (name, email, password, role, standard_id, batch_id, total_fee) VALUES (?, ?, ?, 'student', ?, ?, ?)",
      ["Synthetic Student", "student.test@example.invalid", password, standard.insertId, batch.insertId, 100]
    );
    await write(
      "INSERT INTO students (user_id, name, standard_id, batch_id, total_fee) VALUES (?, ?, ?, ?, ?)",
      [student.insertId, "Synthetic Student", standard.insertId, batch.insertId, 100]
    );
    const [teacher] = await write(
      "INSERT INTO teachers (name, email, mobile, password, status) VALUES (?, ?, ?, ?, 'Active')",
      ["Synthetic Teacher", "teacher.test@example.invalid", "0000000000", password]
    );
    await write(
      "INSERT INTO timetable (batch_id, day, subject_id, teacher_id, time_slot, room) VALUES (?, ?, ?, ?, ?, ?)",
      [batch.insertId, "Monday", subject.insertId, teacher.insertId, "09:00-10:00", "Test Room"]
    );
    await write(
      "INSERT INTO payments (order_id, student_id, amount, status) VALUES (?, ?, ?, 'Created')",
      ["order_test_synthetic_001", student.insertId, 100]
    );
    await connection.commit();
    return { adminId: admin.insertId, studentId: student.insertId, teacherId: teacher.insertId, batchId: batch.insertId };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
});

if (require.main === module) {
  seedFixtures().then(() => console.log("Synthetic test fixtures seeded.")).catch((error) => {
    console.error(`Fixture seeding stopped: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { seedFixtures };
