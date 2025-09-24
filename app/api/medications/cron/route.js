import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/db.js";
import Medication from "../../../../models/Medication.js";
import { sendNotification } from "../../sender/route.js"; // using your sender API

export async function GET() {
  try {
    await dbConnect();
    const medications = await Medication.find({ status: "pending" }).populate(
      "userId"
    );

    const now = new Date();
    const currentHourMinute = `${String(now.getHours()).padStart(
      2,
      "0"
    )}:${String(now.getMinutes()).padStart(2, "0")}`;

    let count = 0;
    for (const med of medications) {
      const scheduleTimes = med.schedule.split(",").map((t) => t.trim());
      if (scheduleTimes.includes(currentHourMinute)) {
        // send notification if email exists
        if (med.userId && med.userId.email) {
          await sendNotification(med.userId.email, `Time to take ${med.name}`);
        }
        med.status = "taken";
        await med.save();
        count++;
      }
    }

    return NextResponse.json({ success: true, processed: count });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
