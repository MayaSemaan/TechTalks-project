import mongoose from "mongoose";
const ReportSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  title: String,
  description: String,
  fileUrl: String,
}, { timestamps: true });

export default mongoose.models.Report || mongoose.model("Report", ReportSchema);