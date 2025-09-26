import { NextResponse } from "next/server";
import connectToDB from "../../../../lib/db.js";
import Medication from "../../../../models/Medication.js";
import User from "../../../../models/User.js";
import { sendNotification } from "../../../utils/sendNotification.js";

export async function GET() {
  await connectToDB();

  try {
    const medications = await Medication.find({ status: "pending" }).populate(
      "userId"
    );

    console.log(`Medications fetched: ${medications.length}`);
    let count = 0;

    const now = new Date();
    now.setSeconds(0, 0); // normalize seconds

    console.log(`Current time (HH:MM): ${now.getHours()}:${now.getMinutes()}`);

    for (const med of medications) {
      const scheduleTimes = med.times || []; // use times array
      let processed = false;

      for (const sched of scheduleTimes) {
        const [hour, minute] = sched.split(":").map(Number);
        const schedDate = new Date(now);
        schedDate.setHours(hour, minute, 0, 0);

        const fiveMinutesAfter = new Date(schedDate.getTime() + 5 * 60000);

        if (now >= schedDate && now <= fiveMinutesAfter) {
          if (med.userId && med.userId.email) {
            console.log(
              `Sending notification for ${med.name} to ${med.userId.email}`
            );
            await sendNotification(
              med.userId.email,
              `Time to take ${med.name}`
            );
          }
          med.status = "taken";
          await med.save();
          count++;
          processed = true;
          break; // stop checking other times
        }
      }

      if (!processed) {
        console.log(
          `Skipping ${med.name}, not scheduled now (scheduled for: ${scheduleTimes})`
        );
      }
    }

    return NextResponse.json({ success: true, processed: count });
  } catch (err) {
    console.error("Error processing medications:", err);
    return NextResponse.json({ success: false, error: err.message });
  }
}
