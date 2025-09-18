import "dotenv/config"; // loads environment variables from .env.local
import dbConnect from "./lib/dbConnect.js";
import Medication from "./lib/models/Medication.js";

(async () => {
  try {
    console.log("MONGO_URI from env:", process.env.MONGO_URI); // check it
    await dbConnect();
    const meds = await Medication.find();
    console.log("Current meds:", meds);
  } catch (err) {
    console.error(err);
  }
})();
