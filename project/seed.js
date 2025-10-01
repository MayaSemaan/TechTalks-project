    
// project/seed.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Medication from "./models/medication.js";
import Report from "./models/report.js";
import path from "path";
import 'dotenv/config';
// 1. Explicitly load environment variables from the .env.local file
// We use path.resolve() to ensure the path is absolute and correct.
// NOTE: Assuming .env.local is in the same directory where you run 'node seed.mjs'
dotenv.config({ path: '.env.local' }); 

async function main() {
  try {
    // Check if MONGO_URI is now loaded successfully
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is still undefined. Check the contents of your .env.local file for typos.");
    }
    
    // Connect using the defined URI
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");
    
    // Clear old data
    console.log("🧹 Clearing existing data...");
    await Medication.deleteMany({});
    await Report.deleteMany({});
    console.log("🧹 Data cleared successfully.");

    // Fake user IDs (in real app, these would come from Users collection)
    const userId = new mongoose.Types.ObjectId();
    const doctorId = new mongoose.Types.ObjectId();

    // Insert Medications
    const meds = await Medication.insertMany([
      { userId, name: "Aspirin", dosage: "100mg", schedule: "Daily", status: "taken" },
      { userId, name: "Ibuprofen", dosage: "200mg", schedule: "Twice Daily", status: "missed" },
      { userId, name: "Vitamin C", dosage: "500mg", schedule: "Daily", status: "pending" },
    ]);

    // Insert Reports
    const reports = await Report.insertMany([
      { patientId: userId, doctorId, title: "Blood Test", description: "Normal results", fileUrl: "./files/report1.pdf" },
      { patientId: userId, doctorId, title: "X-Ray", description: "Minor fracture", fileUrl: "./files/report2.pdf" },
    ]);

    console.log("📦 Seeded Medications:", meds.length);
    console.log("📦 Seeded Reports:", reports.length);
    console.log("✅ Done seeding!");
console.log("📚 Sample User ID:", userId.toString());
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    // Print the specific error message
    console.error(`❌ Seeding error: ${err.message}`);
    process.exit(1);
  }
}

main();
