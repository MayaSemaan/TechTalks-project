import mongoose from "mongoose";

const DoctorSchema = new mongoose.Schema({
  name: String,
  email: String,
  specialization: String,
  patients: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

const Doctor = mongoose.models.Doctor || mongoose.model("Doctor", DoctorSchema);
export default Doctor;
