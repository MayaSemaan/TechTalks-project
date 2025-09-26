import "dotenv/config";
import connectToDB from "./lib/db.js";
import Medication from "./models/Medication.js";

async function updateTestMedication() {
  await connectToDB();

  const now = new Date();
  const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  const res = await Medication.updateOne(
    { name: "Test Medication" }, // find existing
    {
      $set: {
        times: [currentHHMM],
        status: "pending",
        notifiedTimes: [],
      },
    }
  );

  console.log("Test medication updated:", res);
  process.exit();
}

updateTestMedication();
