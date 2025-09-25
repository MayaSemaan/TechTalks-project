import "dotenv/config";
import connectToDB from "./lib/db.js";
import Medication from "./models/Medication.js";
import { sendNotification } from "./app/utils/sendNotification.js";
import cron from "node-cron";

const ENABLE_CRON = process.env.ENABLE_CRON === "true";
const EARLY_MINUTES = 5; // optional early notification

if (ENABLE_CRON) {
  console.log("Cron runner started");

  cron.schedule("* * * * *", async () => {
    console.log("Running cron job...");
    await connectToDB();

    try {
      const medications = await Medication.find({ status: "pending" }).populate(
        "userId"
      );
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;
      let count = 0;

      for (const med of medications) {
        const scheduleTimes = med.schedule.split(",").map((t) => t.trim());

        for (const scheduledTime of scheduleTimes) {
          if (!med.notifiedTimes.includes(scheduledTime)) {
            // Calculate early reminder time
            const [hour, minute] = scheduledTime.split(":").map(Number);
            const scheduledDate = new Date(now);
            scheduledDate.setHours(hour, minute, 0, 0);
            scheduledDate.setMinutes(
              scheduledDate.getMinutes() - EARLY_MINUTES
            );
            const earlyHHMM = `${String(scheduledDate.getHours()).padStart(
              2,
              "0"
            )}:${String(scheduledDate.getMinutes()).padStart(2, "0")}`;

            if (currentHHMM === earlyHHMM) {
              if (med.userId && med.userId.email) {
                console.log(
                  `Sending notification for ${med.name} to ${med.userId.email}`
                );
                await sendNotification(
                  med.userId.email,
                  `Reminder: Time to take ${med.name} in ${EARLY_MINUTES} minutes`
                );
              }

              // Mark this scheduled time as notified
              med.notifiedTimes.push(scheduledTime);

              // If all times notified, mark as taken
              if (med.notifiedTimes.length === scheduleTimes.length) {
                med.status = "taken";
              }

              await med.save();
              count++;
            } else {
              console.log(
                `Skipping ${med.name} at ${currentHHMM}, scheduled for ${scheduledTime}`
              );
            }
          }
        }
      }

      console.log(`Cron job success: ${count} medication(s) processed`);
    } catch (err) {
      console.error("Cron job failed:", err);
    }
  });
}
