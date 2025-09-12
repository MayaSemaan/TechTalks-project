const mongoose = require('mongoose');

const reminderLogSchema = new mongoose.Schema({
  medicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medication' },
  timestamp: Date,
  status: { type: String, enum: ['taken', 'missed'] }
});

module.exports = mongoose.model('ReminderLog', reminderLogSchema);
