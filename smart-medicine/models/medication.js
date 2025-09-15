const mongoose = require('mongoose');
 const medicationSchema = new mongoose.Schema({
     name: String, 
     dosage: String,
     schedule: [String], // ISO timestamps
      userId: String });
       module.exports = mongoose.model('Medication', medicationSchema);