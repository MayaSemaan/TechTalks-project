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
    // For patients → linked doctors
    linkedDoctors: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // For doctors → list of their patients
    patients: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // For patients → linked family members
    linkedFamily: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // For family → patients they are linked to
    linkedPatients: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
