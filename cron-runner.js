import "dotenv/config";
import mongoose from "mongoose";
import connectToDB from "./lib/db.js";
import Medication from "./models/Medication.js";

async function runCron() {
  try {
    await connectToDB();
    console.log("Cron runner started");

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

    console.log("Running cron job...");
    console.log("Current time:", currentTime);

    // Fetch medications for all users
    const meds = await Medication.find({});
    console.log("Medications fetched:", meds.length);

    let processed = 0;

    for (const med of meds) {
      if (!med.times || med.times.length === 0) continue;

      // Ensure notifiedTimes is defined
      med.notifiedTimes = med.notifiedTimes || [];

      for (const scheduledTime of med.times) {
        // Skip if already notified
        if (med.notifiedTimes.includes(scheduledTime)) continue;

        // Process medication if current time matches scheduledTime
        if (currentTime === scheduledTime) {
          // Log the dose
          med.doses.push({ date: now, taken: false });

          // Update status to "pending" (awaiting patient confirmation)
          med.status = "pending";

          // Mark this time as notified
          med.notifiedTimes.push(scheduledTime);

          await med.save();
          processed++;

          console.log(`Processed medication: ${med.name} for ${currentTime}`);
        } else {
          console.log(
            `Skipping ${med.name}, not scheduled now (scheduled for ${scheduledTime})`
          );
        }
      }
    }

    console.log(`Cron job success: ${processed} medication(s) processed`);
    return { success: true, processed };
  } catch (err) {
    console.error("Cron job error:", err.message);
    return { success: false, error: err.message };
  } finally {
    await mongoose.connection.close();
  }
}

runCron();
