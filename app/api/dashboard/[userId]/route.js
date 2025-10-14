import { NextResponse } from "next/server";
import connectToDB from "../../../../lib/db.js";
import Medication from "../../../../models/Medication.js";
import Report from "../../../../models/Report.js";
import { calculateCompliance } from "../../../../lib/complianceHelper.js";

export async function GET(req, { params }) {
  try {
    await connectToDB();
    const { userId } = params;

    const { searchParams } = new URL(req.url);

    // Medication filters
    const statusFilter = searchParams.get("status"); // "taken" | "missed" | ""
    const medFromDate = searchParams.get("fromDate");
    const medToDate = searchParams.get("toDate");

    // Report filters (independent)
    const reportFromDate = searchParams.get("reportFromDate");
    const reportToDate = searchParams.get("reportToDate");

    // --- Medications ---
    const medications = await Medication.find({ userId });
    const medicationsData = medications.map((med) => {
      const medStart = med.startDate ? new Date(med.startDate) : null;
      const medEnd = med.endDate ? new Date(med.endDate) : null;

      let dosesTaken = 0;
      let dosesMissed = 0;
      let dosesPending = 0;

      med.doses.forEach((dose) => {
        const doseDate = new Date(dose.date);

        if (
          (!medStart || doseDate >= medStart) &&
          (!medEnd || doseDate <= medEnd)
        ) {
          // Status filter
          if (
            (statusFilter === "taken" && dose.taken !== true) ||
            (statusFilter === "missed" && dose.taken !== false)
          )
            return;

          // Date range filter
          if (
            (medFromDate && doseDate < new Date(medFromDate + "T00:00:00Z")) ||
            (medToDate && doseDate > new Date(medToDate + "T23:59:59Z"))
          )
            return;

          if (dose.taken === true) dosesTaken++;
          else if (dose.taken === false) dosesMissed++;
          else dosesPending++;
        }
      });

      const totalDoses = dosesTaken + dosesMissed + dosesPending;
      const compliance = totalDoses ? (dosesTaken / totalDoses) * 100 : 0;

      return {
        _id: med._id,
        name: med.name,
        dosage: med.dosage,
        unit: med.unit,
        type: med.type,
        schedule: med.schedule,
        startDate: med.startDate,
        endDate: med.endDate,
        reminders: med.reminders,
        notes: med.notes,
        times: med.times,
        dosesTaken,
        dosesMissed,
        dosesPending,
        compliance: parseFloat(compliance.toFixed(2)),
      };
    });

    // --- Reports ---
    const reportQuery = { patient: userId };

    if (reportFromDate && reportToDate) {
      reportQuery.createdAt = {
        $gte: new Date(reportFromDate + "T00:00:00Z"),
        $lte: new Date(reportToDate + "T23:59:59Z"),
      };
    }

    const reportsRaw = await Report.find(reportQuery).sort({ createdAt: -1 });
    const reports = reportsRaw.map((r) => ({
      _id: r._id,
      title: r.title,
      fileUrl: r.fileUrl,
      uploadedAt: r.createdAt ? r.createdAt.toISOString() : null, // ✅ FIXED
    }));

    // --- Chart Data (last 7 days) ---
    const chartData = [];
    const end = new Date();
    const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dayCompliance = await calculateCompliance(userId, dayStart, dayEnd);

      chartData.push({
        date: dayStart.toISOString().split("T")[0],
        taken: dayCompliance.totalTaken || 0,
        missed: dayCompliance.totalMissed || 0,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // --- Metrics ---
    const totalTaken = chartData.reduce((sum, d) => sum + d.taken, 0);
    const totalDoses = chartData.reduce(
      (sum, d) => sum + d.taken + d.missed,
      0
    );
    const adherencePercent = totalDoses
      ? Math.round((totalTaken / totalDoses) * 100)
      : 0;

    return new Response(
      JSON.stringify({
        medications: medicationsData,
        reports,
        chartData,
        metrics: { adherencePercent },
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Dashboard GET error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to load dashboard data" }),
      { status: 500 }
    );
  }
}
