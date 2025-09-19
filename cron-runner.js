import dbConnect from "./lib/dbConnect.js";
import Medication from "./lib/models/Medication.js";
import { sendNotification } from "./lib/sender.js";
import cron from "node-cron";

const ENABLE_CRON = process.env.ENABLE_CRON === "true";

if (ENABLE_CRON) {
  console.log("Cron runner started");

  // runs every minute (for testing, later change to required interval)
  cron.schedule("* * * * *", async () => {
    console.log("Running cron job...");
    await dbConnect();

    try {
      const medications = await Medication.find({ status: "pending" }).populate(
        "userId"
      );
      let count = 0;

      const now = new Date();
      const currentHourMinute = `${String(now.getHours()).padStart(
        2,
        "0"
      )}:${String(now.getMinutes()).padStart(2, "0")}`;

      for (const med of medications) {
        const scheduleTimes = med.schedule.split(",").map((t) => t.trim());
        if (scheduleTimes.includes(currentHourMinute)) {
          // send notification
          if (med.userId && med.userId.email) {
            await sendNotification(
              med.userId.email,
              `Time to take ${med.name}`
            );
          }

          // update status
          med.status = "taken";
          await med.save();

          count++;
        }
      }

      console.log(`Cron job success: ${count} medication(s) processed`);
    } catch (err) {
      console.error("Cron job failed:", err);
    }
  });
}
