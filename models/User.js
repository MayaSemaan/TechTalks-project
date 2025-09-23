// models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ["doctor", "patient"], required: true },
  password: { type: String, required: true },
});

// This ensures Mongoose only registers the model once
export default mongoose.models.User || mongoose.model("User", UserSchema);
