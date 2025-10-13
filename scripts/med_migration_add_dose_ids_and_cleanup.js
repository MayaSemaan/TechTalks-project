import "dotenv/config";
import crypto from "crypto";
import connectToDB from "../lib/db.js";
import Medication from "../models/Medication.js";

async function migrateMedications() {
  try {
    await connectToDB();
    console.log("✅ Connected to DB. Running migration...");

    const medications = await Medication.find({});
    console.log(`Found ${medications.length} medications.`);

    for (const med of medications) {
      let changed = false;

      if (
        !med.schedule ||
        !["daily", "weekly", "monthly", "custom"].includes(med.schedule)
      ) {
        med.schedule = "daily";
        changed = true;
      }

      if (!med.dosage || med.dosage <= 0) {
        med.dosage = 1;
        changed = true;
      }

      med.doses = Array.isArray(med.doses) ? med.doses : [];
      med.doses = med.doses.map((dose, i) => {
        const updated = { ...dose };
        if (!dose.doseId) {
          updated.doseId = crypto.randomUUID();
          changed = true;
        }
        if (!dose.time || !/^([0-1]\d|2[0-3]):([0-5]\d)$/.test(dose.time)) {
          updated.time = med.times?.[i] || med.times?.[0] || "08:00";
          changed = true;
        }
        if (!dose.date || isNaN(new Date(dose.date).getTime())) {
          updated.date = med.startDate || new Date();
          changed = true;
        }
        if (!["taken", "missed", "pending"].includes(dose.status)) {
          updated.status = "pending";
          changed = true;
        }
        return updated;
      });

      if (changed) {
        await med.save();
        console.log(`✅ Updated medication ${med._id}`);
      }
    }

    console.log("🎉 Migration finished!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

migrateMedications();
