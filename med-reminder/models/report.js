 // models/report.js
 
 
 import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  fileUrl: { type: String, required: true }
}, { timestamps: true });

export default mongoose.models.Report || mongoose.model('Report', ReportSchema);