import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["patient", "doctor", "admin"], // include admin if needed
    default: "patient",
    required: true,
  },
});

// Ensure Mongoose only registers the model once
const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;
