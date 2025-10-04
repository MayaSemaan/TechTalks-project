// File: seed.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/user.js';
import Medication from './models/medication.js';
import ReminderLog from './models/reminderlog.js';

// Load .env.local
dotenv.config({ path: '.env.local' });

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Clear old test data (optional)
    await User.deleteMany({});
    await Medication.deleteMany({});
    await ReminderLog.deleteMany({});

    // Create a test patient
    const patient = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashed_password_here', // replace with hashed password later
      role: 'patient',
    });

    // Create a test medication
    const med = await Medication.create({
      userId: patient._id,
      name: 'Aspirin',
      dosage: '100mg',
      schedule: 'daily',
      status: 'active',
    });

    // Create a reminder log
    await ReminderLog.create({
      userId: patient._id,
      medicationId: med._id,
      timestamp: new Date(),
      status: 'taken',
    });

    console.log('✅ Data seeded successfully!');
    console.log('Patient ID:', patient._id);

    mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error seeding data:', err);
    mongoose.disconnect();
  }
}

seedData();