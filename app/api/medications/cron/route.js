import { NextResponse } from "next/server";
import runCron from "../../../../cron-runner.js";

// Trigger cron job via GET request
export async function GET() {
  try {
    const result = await runCron();
    console.log("Manual cron run result:", result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Error running cron via API:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
