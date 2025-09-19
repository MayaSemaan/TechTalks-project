const mongoose = require('mongoose');

const DoseSchema = new mongoose.Schema({
  date: Date,
  taken: Boolean
}, { _id: false });

const MedicationSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: String,
  doses: [DoseSchema] // simple design: store dose events
});

module.exports = mongoose.model('Medication', MedicationSchema);