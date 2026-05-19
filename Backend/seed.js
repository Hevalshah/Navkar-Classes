require("dotenv").config();
const bcrypt = require("bcryptjs");
const { connectDB } = require("./config/db");
const User = require("./models/User");

const seedUsers = async () => {
  try {
    await connectDB();

    await User.deleteAll();
    console.log("Cleared existing users");

    const hashedPassword = await bcrypt.hash("password123", 10);

    const users = [
      {
        name: "Test Student",
        parentName: "Test Parent",
        mobile: "9999999999",
        email: "student@test.com",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Test Admin",
        mobile: "8888888888",
        email: "admin@test.com",
        password: hashedPassword,
        role: "admin"
      }
    ];

    await User.insertMany(users);
    console.log("Test users created successfully!");
    console.log("\nTest Credentials:");
    console.log("Student - Email: student@test.com, Password: password123");
    console.log("Admin - Email: admin@test.com, Password: password123");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedUsers();
