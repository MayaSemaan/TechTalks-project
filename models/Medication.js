const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  dosage: String,
  schedule: String,
  status: { type: String, enum: ['taken', 'missed'], default: 'missed' }
});

module.exports = mongoose.model('Medication', medicationSchema);

