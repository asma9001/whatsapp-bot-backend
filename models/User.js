const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
});

UserSchema.methods.generateToken = async function () {
  try {
    return await jwt.sign(
      { userId: this._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );
  } catch (error) {
    console.error("Error generating token:", error);
    return null; // Optionally return null or handle the error as needed
  }
};


module.exports = mongoose.model('User', UserSchema);