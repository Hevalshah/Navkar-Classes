const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: {
    type: String,
    enum: ["admin", "student"],
    default: "student"
  }
});

module.exports = mongoose.model("User", UserSchema);
