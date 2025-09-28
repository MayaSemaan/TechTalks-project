import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: String,
  description: String,
  fileUrl: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

export default mongoose.models.Report || mongoose.model("Report", ReportSchema);