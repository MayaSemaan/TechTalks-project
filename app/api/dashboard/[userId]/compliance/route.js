// app/api/dashboard/[userId]/compliance/route.js
import connectToDB from "../../../../../lib/db.js";
import {
  calculateCompliance,
  getMedicationHistory,
} from "../../../../../lib/complianceHelper.js";

export async function GET(req, { params }) {
  try {
    await connectToDB();

    const url = new URL(req.url);
    const userId = params.userId;
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const medicationId = url.searchParams.get("medicationId");

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    const compliance = await calculateCompliance(userId, start, end);
    const history = await getMedicationHistory(userId, start, end);

    const filteredHistory = medicationId
      ? history.filter((h) => h.medicationId.toString() === medicationId)
      : history;

    return new Response(
      JSON.stringify({
        success: true,
        data: { overall: compliance, byMedication: filteredHistory },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Compliance endpoint error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
