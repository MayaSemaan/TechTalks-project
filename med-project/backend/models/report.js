const mongoose = require('mongoose');
const ReportSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: String,
  description: String,
  fileUrl: String,
  uploadedAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Report', ReportSchema);