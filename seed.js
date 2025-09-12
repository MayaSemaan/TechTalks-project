
//this code is used to seed the database with initial data for testing purposes

const mongoose = require('mongoose');
const User = require('./models/User');
const Medication = require('./models/Medication');
const ReminderLog = require('./models/ReminderLog');

// ... connection code ...

const users = [
 { name: 'Dana', email: 'dana@example.com', password: '123456', role: 'patient' },
  { name: 'Ali', email: 'ali@example.com', password: 'abcdef', role: 'patient' },
];

const medications = [
  { name: 'Paracetamol', dosage: '500mg', schedule: '08:00 AM', status: 'taken' },
  { name: 'Ibuprofen', dosage: '200mg', schedule: '02:00 PM', status: 'missed' },
  { name: 'Vitamin D', dosage: '1000 IU', schedule: '09:00 AM', status: 'taken' },
];

// Create reminder logs for last 7 days
const createReminderLogs = (medicationId) => {
  const logs = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    logs.push({
      medicationId,
      timestamp: date,
      status: Math.random() > 0.3 ? 'taken' : 'missed' // 70% taken, 30% missed
    });
  }
  return logs;
};

async function seed() {
  try {
    await mongoose.connect('mongodb://localhost:27017/smart-med', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
    // Clear existing data
    await User.deleteMany({});
    await Medication.deleteMany({});
    await ReminderLog.deleteMany({});

    // Insert users
    const createdUsers = await User.insertMany(users);
    console.log(' Users created:', createdUsers.length);

    // Assign medications to first user
    const userMedications = medications.map(med => ({
      ...med,
      userId: createdUsers[0]._id
    }));

    const createdMeds = await Medication.insertMany(userMedications);
    console.log('✅ Medications created:', createdMeds.length);

    // Create reminder logs for each medication
    const allLogs = [];
    createdMeds.forEach(med => {
      allLogs.push(...createReminderLogs(med._id));
    });

    await ReminderLog.insertMany(allLogs);
    console.log('Reminder logs created:', allLogs.length);

    console.log('\n Database seeded successfully!');
    console.log('Test your API: GET http://localhost:5000/dashboard/${createdUsers[0]._id}');
    
    process.exit(0);
  } catch (err) {
    console.error(' Seeding error:', err);
    process.exit(1);
  }
}

seed();