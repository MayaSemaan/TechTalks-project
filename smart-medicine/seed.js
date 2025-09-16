import mongoose from "mongoose";
import User from "../app/models/user.js";
import Medication from "../app/models/medication.js";
import ReminderLog from "../app/models/reminderlogs.js";
import Report from "../app/models/reports.js";

mongoose.connect(
  "mongodb+srv://mayasemaan:Sk0JkGszO1BSoDMF@cluster0.hvit37m.mongodb.net/smart-medicine?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true }
);

mongoose.connection.once("open", () =>
  console.log("Connected to MongoDB Atlas!")
);
mongoose.connection.on("error", (err) =>
  console.error("MongoDB connection error:", err)
);

async function seed() {
  try {
    await User.deleteMany({});
    await Medication.deleteMany({});
    await ReminderLog.deleteMany({});
    await Report.deleteMany({});

    const doctor = new User({
      _id: "64b8a2e41a3c2d7f12345678",
      name: "Dr. Alice",
      role: "doctor",
      email: "doctor@example.com",
    });
    await doctor.save();

    const patient = new User({
      _id: "64c9f1d5b4e8a9c7d9876543",
      name: "Patient X",
      role: "patient",
      email: "patient@example.com",
    });
    await patient.save();

    console.log("Doctor ID:", doctor._id.toString());
    console.log("Patient ID:", patient._id.toString());

    const meds = await Medication.insertMany([
      {
        name: "Aspirin",
        dosage: "100mg",
        schedule: [new Date()],
        userId: patient._id,
      },
      {
        name: "Vitamin D",
        dosage: "50mg",
        schedule: [new Date()],
        userId: patient._id,
      },
    ]);

    await ReminderLog.insertMany([
      {
        userId: patient._id,
        medicationId: meds[0]._id,
        timestamp: new Date(),
        status: "taken",
        reminderType: "app",
      },
      {
        userId: patient._id,
        medicationId: meds[1]._id,
        timestamp: new Date(),
        status: "missed",
        reminderType: "app",
      },
    ]);

    // Create reports properly and populate immediately
    const report1 = new Report({
      title: "Blood Test",
      description: "Blood test results are normal.",
      doctor: doctor._id,
      patient: patient._id,
    });
    const report2 = new Report({
      title: "X-Ray",
      description: "X-Ray shows no issues.",
      doctor: doctor._id,
      patient: patient._id,
    });
    await report1.save();
    await report2.save();

    console.log(
      "Reports created:",
      report1._id.toString(),
      report2._id.toString()
    );

    // Populate doctor and patient in reports for confirmation
    await report1.populate("doctor patient", "name role");
    await report2.populate("doctor patient", "name role");

    console.log("Populated reports:", report1, report2);

    console.log("Seeding done!");
  } catch (error) {
    console.error("Error seeding data:", error);
  } finally {
    mongoose.connection.close();
  }
}

seed();
