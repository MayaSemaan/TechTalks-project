const mongoose = require('mongoose');
 const reminderLogSchema = new mongoose.Schema({
     userId: String,
      medicationId: String,
       timestamp: String, 
       status: String,
        reminderType: String });
 module.exports = mongoose.model('ReminderLog', reminderLogSchema); 