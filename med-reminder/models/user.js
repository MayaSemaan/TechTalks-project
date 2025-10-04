

// models/user.js

import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['patient', 'family', 'doctor'], required: true },
  specialization: { type: String }, // For doctors
  patients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // For doctors
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);