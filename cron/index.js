import cron from "node-cron";
import runCron from "../cron-runner.js";

function logTime() {
  return new Date().toLocaleString();
}

// Run every minute
cron.schedule("* * * * *", async () => {
  console.log(`[${logTime()}] Running scheduled cron job...`);
  try {
    const result = await runCron();
    if (result.success) {
      console.log(`[${logTime()}] Processed ${result.processed} medications.`);
    } else {
      console.error(`[${logTime()}] Cron job failed:`, result.error);
    }
  } catch (err) {
    console.error(`[${logTime()}] Unexpected error in cron job:`, err);
  }
});

console.log(
  `[${logTime()}] Cron scheduler started. Waiting for the next run...`
);
