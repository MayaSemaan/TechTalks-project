const mongoose = require('mongoose');

// Custom validator for schedule format (HH:MM AM/PM)
function validateSchedule(value) {
  // Example: "08:00 AM", "2:30 PM"
  const regex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;
  return regex.test(value);
}

const MedicationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, "User ID is required"] 
  },
  name: { 
    type: String, 
    required: [true, "Medication name is required"], 
    trim: true 
  },
  dosage: { 
    type: String, 
    required: [true, "Dosage is required"] 
  },
  schedule: { 
    type: String, 
    required: [true, "Schedule is required"], 
    validate: {
      validator: validateSchedule,
      message: props => `${props.value} is not a valid schedule! Use HH:MM AM/PM`
    }
  },
  status: { 
    type: String, 
    enum: ['taken', 'missed'], 
    default: 'taken' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Medication', MedicationSchema);
