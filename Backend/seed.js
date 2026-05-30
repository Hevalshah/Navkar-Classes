require("dotenv").config();
const bcrypt = require("bcryptjs");
const { connectDB, pool } = require("./config/db");
const User = require("./models/User");

const seedDatabase = async () => {
  try {
    console.log("Initializing database connection...");
    await connectDB();

    console.log("Clearing existing tables (disabling foreign key checks)...");
    await pool.query("SET FOREIGN_KEY_CHECKS = 0");
    await pool.query("TRUNCATE TABLE fee_records");
    await pool.query("TRUNCATE TABLE attendance");
    await pool.query("TRUNCATE TABLE test_submissions");
    await pool.query("TRUNCATE TABLE tests");
    await pool.query("TRUNCATE TABLE materials");
    await pool.query("TRUNCATE TABLE timetable");
    await pool.query("TRUNCATE TABLE users");
    await pool.query("TRUNCATE TABLE teachers");
    await pool.query("TRUNCATE TABLE subjects");
    await pool.query("TRUNCATE TABLE batches");
    await pool.query("TRUNCATE TABLE standards");
    await pool.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log("Seeding Standards...");
    const [std10Result] = await pool.query("INSERT INTO standards (name) VALUES ('Standard 10')");
    const [std12Result] = await pool.query("INSERT INTO standards (name) VALUES ('12th Commerce')");
    
    const std10Id = std10Result.insertId;
    const std12Id = std12Result.insertId;

    console.log("Seeding Batches...");
    const [batch10Result] = await pool.query("INSERT INTO batches (name, standard_id) VALUES ('Standard 10 - Batch A', ?)", [std10Id]);
    const [batch12Result] = await pool.query("INSERT INTO batches (name, standard_id) VALUES ('12th Commerce - Batch A', ?)", [std12Id]);
    
    const batch10Id = batch10Result.insertId;
    const batch12Id = batch12Result.insertId;

    console.log("Seeding Subjects...");
    const [subMathResult] = await pool.query("INSERT INTO subjects (name, standard_id) VALUES ('Mathematics / Algebra', ?)", [std10Id]);
    const [subSciResult] = await pool.query("INSERT INTO subjects (name, standard_id) VALUES ('Science & Technology', ?)", [std10Id]);
    const [subAccResult] = await pool.query("INSERT INTO subjects (name, standard_id) VALUES ('Accountancy', ?)", [std12Id]);
    const [subEcoResult] = await pool.query("INSERT INTO subjects (name, standard_id) VALUES ('Economics', ?)", [std12Id]);

    const subMathId = subMathResult.insertId;
    const subSciId = subSciResult.insertId;
    const subAccId = subAccResult.insertId;
    const subEcoId = subEcoResult.insertId;

    const hashedPassword = await bcrypt.hash("password123", 10);

    console.log("Seeding Teachers...");
    const [t1Result] = await pool.query("INSERT INTO teachers (name, email, mobile, password, status) VALUES ('Prof. R. C. Shah', 'rcshah@navkar.com', '9876543210', ?, 'Active')", [hashedPassword]);
    const [t2Result] = await pool.query("INSERT INTO teachers (name, email, mobile, password, status) VALUES ('Prof. N. K. Vyas', 'nkvyas@navkar.com', '9876543211', ?, 'Active')", [hashedPassword]);
    const [t3Result] = await pool.query("INSERT INTO teachers (name, email, mobile, password, status) VALUES ('Prof. Harish Mehta', 'hmehta@navkar.com', '9876543212', ?, 'Active')", [hashedPassword]);

    const t1Id = t1Result.insertId;
    const t2Id = t2Result.insertId;
    const t3Id = t3Result.insertId;

    console.log("Seeding Timetable...");
    await pool.query(
      "INSERT INTO timetable (batch_id, day, subject_id, teacher_id, time_slot, room) VALUES (?, 'Monday', ?, ?, '08:00 AM - 10:00 AM', 'Room 101')",
      [batch10Id, subMathId, t1Id]
    );
    await pool.query(
      "INSERT INTO timetable (batch_id, day, subject_id, teacher_id, time_slot, room) VALUES (?, 'Tuesday', ?, ?, '08:00 AM - 10:00 AM', 'Room 101')",
      [batch10Id, subSciId, t2Id]
    );
    await pool.query(
      "INSERT INTO timetable (batch_id, day, subject_id, teacher_id, time_slot, room) VALUES (?, 'Monday', ?, ?, '10:30 AM - 12:30 PM', 'Room 202')",
      [batch12Id, subAccId, t3Id]
    );
    await pool.query(
      "INSERT INTO timetable (batch_id, day, subject_id, teacher_id, time_slot, room) VALUES (?, 'Wednesday', ?, ?, '10:30 AM - 12:30 PM', 'Room 202')",
      [batch12Id, subEcoId, t3Id]
    );

    console.log("Seeding Users...");

    const users = [
      {
        name: "Test Student",
        parentName: "Richard Student",
        mobile: "9999999999",
        email: "student@test.com",
        username: "student",
        password: hashedPassword,
        role: "student",
        address: "Navkar Heights, Ahmedabad",
        course: "Standard 10",
        assignedBatch: "Standard 10 - Batch A",
        standardId: std10Id,
        batchId: batch10Id
      },
      {
        name: "Test Admin",
        mobile: "8888888888",
        email: "admin@test.com",
        username: "admin",
        password: hashedPassword,
        role: "admin",
        address: "Navkar Head Office, Ahmedabad",
        course: null,
        assignedBatch: null,
        standardId: null,
        batchId: null
      }
    ];

    await User.insertMany(users);
    console.log("Database seeded successfully!");
    console.log("\nCredentials:");
    console.log("Student - Email/Username: student@test.com / student, Password: password123");
    console.log("Admin - Email/Username: admin@test.com / admin, Password: password123");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
