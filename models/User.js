import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["patient", "doctor", "family"],
      default: "patient",
    },

    // Relations
    linkedDoctor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    linkedFamily: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    patient: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
