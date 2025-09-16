import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true }, // 'doctor' or 'patient'
  email: { type: String, required: true, unique: true }, // important
});

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
