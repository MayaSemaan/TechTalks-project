// Load environment variables from .env.local
import "dotenv/config";
import cron from "node-cron";
import axios from "axios";

// DEBUG: check environment variable
console.log("ENABLE_CRON from env:", process.env.ENABLE_CRON);

const CRON_ENABLED = process.env.ENABLE_CRON === "true";
const CRON_URL =
  process.env.MEDS_CRON_URL ||
  "http://localhost:3000/api/medications/cron-mock";
const CRON_TOKEN = process.env.CRON_SERVICE_TOKEN || "dev-token";

if (!CRON_ENABLED) {
  console.log("Cron disabled");
  process.exit(0);
}

console.log("Cron runner started");

// Run every minute (adjust schedule as needed)
cron.schedule("* * * * *", async () => {
  console.log("Running cron job...");

  try {
    const res = await axios.post(
      CRON_URL,
      {}, // body can be empty for now
      { headers: { Authorization: `Bearer ${CRON_TOKEN}` } }
    );
    console.log("Cron job success:", res.data);
  } catch (err) {
    console.error("Cron job failed:", err.message);
  }
});
