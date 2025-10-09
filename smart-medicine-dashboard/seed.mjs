import mongoose from "mongoose";
import dotenv from "dotenv";

import User from "./models/user.js";
import Medication from "./models/medication.js";
import ReminderLog from "./models/reminderlog.js";
import Report from "./models/report.js";

dotenv.config({ path: ".env.local" });
console.log("Using MONGO_URI:", process.env.MONGO_URI);

// ====== Connect to MongoDB ======
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected!");
  } catch (err) {
    console.error("❌ DB connection error:", err);
    process.exit(1);
  }
}

// ====== Seed Function ======
async function seedData() {
  await connectDB();

  // Clear old data
  await Promise.all([
    User.deleteMany(),
    Medication.deleteMany(),
    ReminderLog.deleteMany(),
    Report.deleteMany(),
  ]);

  // Create a patient (User)
  const patient = await User.create({
    name: "Dana Deeb",
    email: "dana@example.com",
    passwordHash: "hashedpassword456",
    role: "patient",
  });

  // Create medications
  const meds = await Medication.insertMany([
    {
      userId: patient._id,
      name: "Paracetamol",
      dosage: "500mg",
      schedule: "2 times/day",
      status: "taken",
    },
    {
      userId: patient._id,
      name: "Aspirin",
      dosage: "100mg",
      schedule: "1 time/day",
      status: "missed",
    },
  ]);

  // Create reminder logs (7 days)
  const today = new Date();
  const logs = [];
  const statuses = ["taken", "missed"];

  for (let i = 0; i < 7; i++) {
    const logDate = new Date(today);
    logDate.setDate(today.getDate() - i);
    logs.push({
      medicationId: meds[0]._id,
      timestamp: logDate,
      status: statuses[Math.floor(Math.random() * statuses.length)],
    });
  }
  await ReminderLog.insertMany(logs);

  // Create sample doctor reports
  await Report.insertMany([
    {
      patientId: patient._id,
      doctorId: new mongoose.Types.ObjectId(), // dummy doctor reference
      title: "Heart Health Report",
      description: "Patient shows good recovery progress.",
      fileUrl: "/uploads/heart-report.pdf",
      createdAt: new Date(),
    },
    {
      patientId: patient._id,
      doctorId: new mongoose.Types.ObjectId(),
      title: "Blood Pressure Report",
      description: "Slightly elevated readings; monitor daily.",
      fileUrl: "/uploads/bp-report.pdf",
      createdAt: new Date(),
    },
  ]);
console.log("Patient ID:", patient._id.toString());
  console.log("🌱 Database seeded successfully!");
  process.exit(0);
}

// Run seeder
seedData();