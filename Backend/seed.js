require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/user");

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        // Clear existing users
        await User.deleteMany({});
        console.log("Cleared existing users");

        // Hash passwords
        const hashedPassword = await bcrypt.hash("password123", 10);

        // Create test users
        const users = [
            {
                email: "student@test.com",
                password: hashedPassword,
                role: "student"
            },
            {
                email: "admin@test.com",
                password: hashedPassword,
                role: "admin"
            }
        ];

        await User.insertMany(users);
        console.log("✅ Test users created successfully!");
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
