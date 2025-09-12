//this file seeds the database with initial data for testing purposes

const mongoose = require('mongoose');
const User = require('./models/user');
const Medication = require('./models/medication');
const ReminderLog = require('./models/reminderlogs');

mongoose.connect('mongodb://127.0.0.1:27017/smart-medicine', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function seed() {
  await User.deleteMany({});
  await Medication.deleteMany({});
  await ReminderLog.deleteMany({});

  const user = await User.create({ name: 'John Doe', role: 'patient' });

  const meds = await Medication.insertMany([
    { name: 'Aspirin', dosage: '100mg', schedule: [new Date().toISOString()], userId: user._id },
    { name: 'Vitamin D', dosage: '50mg', schedule: [new Date().toISOString()], userId: user._id }
  ]);

  const logs = await ReminderLog.insertMany([
    { userId: user._id, medicationId: meds[0]._id, timestamp: new Date().toISOString(), status: 'taken', reminderType: 'app' },
    { userId: user._id, medicationId: meds[1]._id, timestamp: new Date().toISOString(), status: 'missed', reminderType: 'app' }
  ]);

  console.log('Seeding done');
  mongoose.connection.close();
}

seed();