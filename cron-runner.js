import "dotenv/config";
import mongoose from "mongoose";
import connectToDB from "./lib/db.js";

import Medication from "./models/Medication.js";
import User from "./models/User.js";
import { sendNotification } from "./app/utils/sendNotification.js";

// Connect to DB only once
await connectToDB();
console.log("Connected to database:", mongoose.connection.name);

// Helper: convert "HH:MM" string to minutes since midnight
function timeStringToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

// Get current time in minutes since midnight
function getCurrentTimeMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

async function runCron() {
  try {
    console.log("Cron runner started");

    const now = new Date();
    const currentMinutes = getCurrentTimeMinutes();

    console.log(
      "Current time:",
      now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    );

    const medications = await Medication.find({
      status: { $in: ["pending", "taken"] },
    });

    if (!medications.length) {
      console.log("No medications found for processing.");
      return { success: true, processed: 0 };
    }

    let processed = 0;

    for (const med of medications) {
      med.doses = Array.isArray(med.doses) ? med.doses : [];
      med.notifiedTimes = Array.isArray(med.notifiedTimes)
        ? med.notifiedTimes
        : [];
      med.times = Array.isArray(med.times) ? med.times : [];

      const user = await User.findById(med.userId);
      if (!user) {
        console.log(
          `Skipping medication "${med.name}": userId "${med.userId}" not found`
        );
        continue;
      }

      let medUpdated = false;

      for (const sched of med.times) {
        if (!med.notifiedTimes.includes(sched)) {
          const schedMinutes = timeStringToMinutes(sched);
          // Allow ±1 minute window
          if (Math.abs(schedMinutes - currentMinutes) <= 1) {
            console.log(
              `Processing medication "${med.name}" for ${user.email} (scheduled: ${sched})`
            );

            if (user.email) {
              try {
                await sendNotification(user.email, `Time to take ${med.name}`);
              } catch (err) {
                console.error(
                  `Failed to send notification for ${med.name}:`,
                  err
                );
              }
            }

            med.doses.push({ date: now, taken: false });
            med.status = "pending";
            med.notifiedTimes.push(sched);

            medUpdated = true;
            processed++;
          }
        }
      }

      if (medUpdated) {
        console.log(`Saving medication "${med.name}" with doses:`, med.doses);
        await med.save();
      }
    }

    console.log(`Cron job finished: ${processed} medications processed`);
    return { success: true, processed };
  } catch (err) {
    console.error("Cron job error:", err);
    return { success: false, error: err.message };
  }
}

export default runCron;
