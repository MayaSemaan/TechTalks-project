// app/api/dashboard/[userId]/charts/route.js
import connectToDB from "../../../../../lib/db.js";
import Medication from "../../../../../models/Medication.js";
import ReminderLog from "../../../../../models/ReminderLog.js";
import { calculateCompliance } from "../../../../../lib/complianceHelper.js";

export async function GET(req, { params }) {
  try {
    await connectToDB();

    const url = new URL(req.url);
    const userId = params.userId;
    const days = parseInt(url.searchParams.get("days") || "30");

    const end = new Date();
    const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

    const chartData = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Calculate daily compliance using your helper
      const dayCompliance = await calculateCompliance(userId, dayStart, dayEnd);

      chartData.push({
        date: dayStart.toISOString().split("T")[0],
        taken: dayCompliance.totalTaken || 0,
        missed: dayCompliance.totalMissed || 0,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return new Response(
      JSON.stringify({ success: true, chartData }), // directly chartData
      { status: 200 }
    );
  } catch (error) {
    console.error("Charts endpoint error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
