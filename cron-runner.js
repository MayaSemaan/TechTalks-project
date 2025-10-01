// cron-runner.js
import "dotenv/config";
import mongoose from "mongoose";
import connectToDB from "./lib/db.js";

// Connect to DB first
await connectToDB();
console.log("Connected to database:", mongoose.connection.name);

// Import models
import Medication from "./models/Medication.js";
import User from "./models/User.js";
import { sendNotification } from "./app/utils/sendNotification.js";

async function runCron() {
  try {
    console.log("Cron runner started");

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    console.log("Current time:", currentTime);

    // Get all medications that are pending or taken
    const medications = await Medication.find({
      status: { $in: ["pending", "taken"] },
    });

    let processed = 0;

    for (const med of medications) {
      // Ensure arrays exist
      med.doses = Array.isArray(med.doses) ? med.doses : [];
      med.notifiedTimes = Array.isArray(med.notifiedTimes)
        ? med.notifiedTimes
        : [];
      med.times = Array.isArray(med.times) ? med.times : [];

      // Check if the user exists
      const user = await User.findById(med.userId);
      if (!user) {
        console.log(
          `Skipping medication "${med.name}": userId "${med.userId}" not found`
        );
        continue; // skip this medication
      }

      let medUpdated = false;

      for (const sched of med.times) {
        if (!med.notifiedTimes.includes(sched) && sched === currentTime) {
          console.log(`Processing medication: "${med.name}" for ${user.email}`);

          // Send notification if user has email
          if (user.email) {
            await sendNotification(user.email, `Time to take ${med.name}`);
          }

          // Log the dose
          med.doses.push({ date: now, taken: false });

          // Update status to "pending" until user confirms
          med.status = "pending";

          // Mark as notified for this time
          med.notifiedTimes.push(sched);

          medUpdated = true;
          processed++;
        }
      }

      // Save medication only if updated
      if (medUpdated) {
        console.log("Before save:", {
          doses: med.doses,
          notifiedTimes: med.notifiedTimes,
        });

        await med.save();

        console.log("After save:", {
          doses: med.doses,
          notifiedTimes: med.notifiedTimes,
        });
      }
    }

    console.log(`Cron job finished: ${processed} medications processed`);
    return { success: true, processed };
  } catch (err) {
    console.error("Cron job error:", err);
    return { success: false, error: err.message };
  }
}

// Run immediately (for testing)
runCron();

export default runCron;
