import "dotenv/config";
import ReminderLog from "./models/ReminderLog.js";
import mongoose from "mongoose";
import connectToDB from "./lib/db.js";
import { toZonedTime, format } from "date-fns-tz";

import Medication from "./models/Medication.js";
import User from "./models/User.js";
import { sendNotification } from "./app/utils/sendNotification.js";

// Connect to DB first
await connectToDB();
console.log("✅ Connected to database:", mongoose.connection.name);

// Normalize HH:mm strings
function normalizeTimeString(time) {
  if (!time) return null;
  const parts = time.split(":").map((x) => x.padStart(2, "0"));
  return `${parts[0]}:${parts[1]}`;
}

// Reset notifiedTimes if last dose was on a previous day
function resetNotifiedTimesIfNewDay(med, now, timeZone) {
  if (!Array.isArray(med.doses) || med.doses.length === 0) return;

  const lastDose = med.doses[med.doses.length - 1];
  const lastDoseDate = format(
    toZonedTime(lastDose.date, timeZone),
    "yyyy-MM-dd",
    { timeZone }
  );
  const today = format(toZonedTime(now, timeZone), "yyyy-MM-dd", { timeZone });

  if (lastDoseDate !== today) {
    med.notifiedTimes = [];
    console.log(`♻️ Reset notifiedTimes for ${med.name} (new day)`);
  }
}

async function runCron(timeZone = "Asia/Beirut") {
  try {
    console.log("🚀 Cron runner started");

    const now = new Date();
    const beirutTime = format(toZonedTime(now, timeZone), "HH:mm", {
      timeZone,
    });
    console.log("🕒 Current Beirut time:", beirutTime);

    const medications = await Medication.find({
      status: { $in: ["pending", "taken"] },
    });

    console.log("📦 Found", medications.length, "medications to check");

    let processed = 0;

    for (const med of medications) {
      med.doses = Array.isArray(med.doses) ? med.doses : [];
      med.notifiedTimes = Array.isArray(med.notifiedTimes)
        ? med.notifiedTimes
        : [];
      med.times = Array.isArray(med.times) ? med.times : [];

      // Reset daily notifiedTimes
      resetNotifiedTimesIfNewDay(med, now, timeZone);

      const user = await User.findById(med.userId);
      if (!user) {
        console.log(`⚠️ Skipping ${med.name}: user not found`);
        continue;
      }

      console.log(`\n💊 Checking medication: ${med.name}`);
      console.log("→ Times:", med.times);
      console.log("→ Notified:", med.notifiedTimes);

      let medUpdated = false;

      for (let sched of med.times) {
        sched = normalizeTimeString(sched);
        const nowNorm = normalizeTimeString(beirutTime);

        if (!sched || !nowNorm) continue;

        const schedDate = new Date(`1970-01-01T${sched}:00Z`);
        const nowDate = new Date(`1970-01-01T${nowNorm}:00Z`);
        let diffMinutes = Math.abs((schedDate - nowDate) / 60000);
        if (diffMinutes > 720) diffMinutes = 1440 - diffMinutes; // handle wraparound

        if (!med.notifiedTimes.includes(sched)) {
          console.log(
            `   ⏱ Comparing → scheduled: ${sched}, now: ${nowNorm}, diff: ${diffMinutes.toFixed(
              1
            )} min`
          );
        }

        // ±3 minutes tolerance
        if (!med.notifiedTimes.includes(sched) && diffMinutes <= 3) {
          console.log(
            `🔔 MATCH! Sending notification for ${med.name} (scheduled ${sched}, now ${nowNorm})`
          );

          // Send email notification
          if (user.email) {
            try {
              await sendNotification(user.email, `Time to take ${med.name}`);
            } catch (err) {
              console.error(`❌ Failed to send notification:`, err.message);
            }
          }

          // Log reminder with "pending" status
          try {
            await ReminderLog.create({
              userId: user._id,
              medicationId: med._id,
              timestamp: now,
              status: "pending", // <- changed here
            });
            console.log(`📝 Logged reminder for ${med.name} at ${sched}`);
          } catch (logErr) {
            console.error(
              `❌ Failed to log reminder for ${med.name}:`,
              logErr.message
            );
          }

          // Push dose with both date and time
          med.doses.push({ date: now, time: sched, taken: false });
          med.status = "pending";
          med.notifiedTimes.push(sched);

          medUpdated = true;
          processed++;
        }
      }

      if (medUpdated) {
        try {
          med.doses = med.doses.filter((d) => d && d.date && d.time);
          await med.save();
          console.log(`✅ Saved updates for ${med.name}`);
        } catch (saveErr) {
          console.error(`❌ Error saving ${med.name}:`, saveErr.message);
        }
      } else {
        console.log(`⚙️ No matches for ${med.name}`);
      }
    }

    console.log(`\n✅ Cron finished → processed ${processed} medications`);
    return { success: true, processed };
  } catch (err) {
    console.error("❌ Cron job error:", err);
    return { success: false, error: err.message };
  }
}

// Only auto-run if executed directly
if (process.argv[1].includes("cron-runner.js")) {
  runCron();
}

export default runCron;
