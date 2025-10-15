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

    // Report filters
    const reportFromDate = searchParams.get("reportFromDate");
    const reportToDate = searchParams.get("reportToDate");

    // ----------------------- MEDICATIONS -----------------------
    const medications = await Medication.find({ userId });

    const medicationsData = medications
      .map((med) => {
        const filteredDoses = med.doses.filter((dose) => {
          const doseDate = new Date(dose.date);

          // Apply date range filters
          if (medFromDate && doseDate < new Date(`${medFromDate}T00:00:00Z`))
            return false;
          if (medToDate && doseDate > new Date(`${medToDate}T23:59:59Z`))
            return false;

          // Apply status filters
          if (statusFilter === "taken" && dose.taken !== true) return false;
          if (statusFilter === "missed" && dose.taken !== false) return false;

          return true;
        });

        if (filteredDoses.length === 0) return null;

        const dosesTaken = filteredDoses.filter((d) => d.taken === true).length;
        const dosesMissed = filteredDoses.filter(
          (d) => d.taken === false
        ).length;
        const dosesPending = filteredDoses.filter(
          (d) => d.taken === null
        ).length;

        const totalDoses = filteredDoses.length;
        const compliance = totalDoses ? (dosesTaken / totalDoses) * 100 : 0;

        return {
          _id: med._id,
          name: med.name,
          dosage: med.dosage,
          unit: med.unit,
          type: med.type,
          schedule: med.schedule,
          reminders: med.reminders,
          notes: med.notes,
          dosesTaken,
          dosesMissed,
          dosesPending,
          compliance: parseFloat(compliance.toFixed(2)),
          filteredDoses: filteredDoses.map((d) => ({
            doseId: d.doseId,
            date: d.date,
            time: d.time,
            taken: d.taken,
          })),
        };
      })
      .filter(Boolean);

    // ----------------------- REPORTS -----------------------
    const reportQuery = { patient: userId };
    if (reportFromDate || reportToDate) {
      reportQuery.createdAt = {};
      if (reportFromDate)
        reportQuery.createdAt.$gte = new Date(`${reportFromDate}T00:00:00Z`);
      if (reportToDate)
        reportQuery.createdAt.$lte = new Date(`${reportToDate}T23:59:59Z`);
    }

    const reportsRaw = await Report.find(reportQuery).sort({ createdAt: -1 });
    const reports = reportsRaw.map((r) => ({
      _id: r._id,
      title: r.title,
      fileUrl: r.fileUrl,
      uploadedAt: r.createdAt ? r.createdAt.toISOString() : null,
    }));

    // ----------------------- CHART DATA (last 7 days) -----------------------
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

    // ----------------------- METRICS -----------------------
    const totalTaken = chartData.reduce((sum, d) => sum + d.taken, 0);
    const totalDoses = chartData.reduce(
      (sum, d) => sum + d.taken + d.missed,
      0
    );
    const adherencePercent = totalDoses
      ? Math.round((totalTaken / totalDoses) * 100)
      : 0;

    return NextResponse.json({
      medications: medicationsData,
      reports,
      chartData,
      metrics: { adherencePercent },
    });
  } catch (err) {
    console.error("Dashboard GET error:", err);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
