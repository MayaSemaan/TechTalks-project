import { NextResponse } from "next/server";
import runCron from "../../../../cron-runner.js";
import { toZonedTime, format } from "date-fns-tz";

// Trigger cron job via GET request
export async function GET() {
  try {
    const serverLocalTime = new Date().toLocaleString();
    const timeZone = "Asia/Beirut";
    const beirutTime = format(toZonedTime(new Date(), timeZone), "HH:mm", {
      timeZone,
    });

    console.log("🌍 Server local time:", serverLocalTime);
    console.log("🕒 Beirut local time:", beirutTime);

    // Pass timezone info to cron
    const result = await runCron(timeZone);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error running cron via API:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
