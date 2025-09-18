import mongoose from "mongoose";

const doctorReportSchema = new mongoose.Schema({
  doctorId: String,
  patientEmail: String,
  fileUrl: String,
  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.models.DoctorReport ||
  mongoose.model("DoctorReport", doctorReportSchema);
