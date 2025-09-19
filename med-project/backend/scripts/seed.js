const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/user');
const Medication = require('../models/medication');
const Report = require('../models/report');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/medapp');
  await User.deleteMany({});
  await Medication.deleteMany({});
  await Report.deleteMany({});

  const user = await User.create({ name: 'Test Patient', email: 'p@example.com', role: 'patient' });

  // create medication with doses for last 10 days
  const doses = [];
  for (let i = 0; i < 10; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    doses.push({ date: d, taken: Math.random() > 0.3 });
  }

  await Medication.create({ patient: user._id, name: 'Aspirin', doses });
  await Report.create({ patient: user._id, title: 'Blood Test', description: 'CBC', fileUrl: 'https://example.com/report1.pdf' });

  console.log('seed done. patient id:', user._id.toString());
  process.exit(0);
}
run();