// scripts/seedUsers.js
import "dotenv/config";
import dbConnect from "../lib/db.js";
import User from "../models/User.js";

async function seedUsers() {
  try {
    await dbConnect();

    const users = [
      {
        name: "Doctor",
        email: "doctor@example.com",
        role: "doctor",
        password: "test123",
      },
      {
        name: "Patient",
        email: "patient@example.com",
        role: "patient",
        password: "test123",
      },
    ];

    for (const u of users) {
      await User.updateOne({ email: u.email }, { $set: u }, { upsert: true });
    }

    const doctor = await User.findOne({ email: "doctor@example.com" });
    const patient = await User.findOne({ email: "patient@example.com" });

    console.log("Users seeded successfully!");
    console.log("Doctor _id:", doctor._id.toString());
    console.log("Patient _id:", patient._id.toString());

    process.exit(0);
  } catch (err) {
    console.error("Error seeding users:", err);
    process.exit(1);
  }
}

seedUsers();
