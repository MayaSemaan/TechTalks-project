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
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

    const dailyData = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dayCompliance = await calculateCompliance(userId, dayStart, dayEnd);

      dailyData.push({
        date: dayStart.toISOString().split("T")[0],
        compliancePercentage: dayCompliance.compliancePercentage,
        taken: dayCompliance.totalTaken,
        missed: dayCompliance.totalMissed,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    const medications = await Medication.find({ userId });
    const medBreakdown = await Promise.all(
      medications.map(async (med) => {
        const logs = await ReminderLog.find({
          userId,
          medicationId: med._id,
          timestamp: { $gte: start, $lte: end },
        });

        const taken = logs.filter((log) => log.status === "taken").length;
        const missed = logs.filter((log) => log.status === "missed").length;

        return { name: med.name, taken, missed, total: taken + missed };
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: { dailyCompliance: dailyData, medicationBreakdown: medBreakdown },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Charts endpoint error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
