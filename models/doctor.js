// app/models/doctor.js
import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    specialization: { type: String, required: true },
    phone: { type: String, required: true },
    patients: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // changed ref to "User"
  },
  { timestamps: true }
);

const Doctor = mongoose.models.Doctor || mongoose.model("Doctor", doctorSchema);
export default Doctor;
