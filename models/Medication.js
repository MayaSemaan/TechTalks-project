const mongoose = require('mongoose');

const MedicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  schedule: { type: String, required: true }, // could be time or frequency
  status: { type: String, enum: ["taken", "missed"], default: "missed" }
}, { timestamps: true });

module.exports = mongoose.model('Medication', MedicationSchema);
