import { NextResponse } from "next/server";
import connectToDB from "../../../../lib/db.js";
import Medication from "../../../../models/Medication.js";
import Report from "../../../../models/Report.js";
import User from "../../../../models/User.js";
import { calculateCompliance } from "../../../../lib/complianceHelper.js";
import { authenticate } from "../../../../middlewares/auth.js";

export async function GET(req, { params }) {
  try {
    await connectToDB();
    const { userId } = params;
    const { searchParams } = new URL(req.url);

    // ------------------- Fetch logged-in user -------------------
    let loggedInUser = null;
    try {
      loggedInUser = await authenticate(req); // patient/doctor/family
    } catch {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ------------------- Fetch patient/user -------------------
    const user = await User.findById(userId).select("name email role");
    if (!user)
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );

    // ------------------- Medications -------------------
    const statusFilter = searchParams.get("status"); // "taken" | "missed" | ""
    const medFromDate = searchParams.get("fromDate");
    const medToDate = searchParams.get("toDate");

    const medications = await Medication.find({ userId });

    const medicationsData = medications
      .map((med) => {
        const filteredDoses = med.doses.filter((dose) => {
          const doseDate = new Date(dose.date);
          if (medFromDate && doseDate < new Date(`${medFromDate}T00:00:00Z`))
            return false;
          if (medToDate && doseDate > new Date(`${medToDate}T23:59:59Z`))
            return false;
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

    // ------------------- Reports -------------------
    const reportFromDate = searchParams.get("reportFromDate");
    const reportToDate = searchParams.get("reportToDate");

    const reportQuery = { patient: userId };
    if (reportFromDate || reportToDate) {
      reportQuery.createdAt = {};
      if (reportFromDate)
        reportQuery.createdAt.$gte = new Date(`${reportFromDate}T00:00:00Z`);
      if (reportToDate)
        reportQuery.createdAt.$lte = new Date(`${reportToDate}T23:59:59Z`);
    }

    const reportsRaw = await Report.find(reportQuery)
      .sort({ createdAt: -1 })
      .populate("doctor", "name email specialization");

    const reports = reportsRaw.map((r) => ({
      reportId: r._id,
      title: r.title,
      description: r.description,
      fileUrl: r.fileUrl,
      uploadedAt: r.createdAt?.toISOString() || null,
      doctorName: r.doctor?.name || "Unknown",
      doctorEmail: r.doctor?.email || "",
      doctorSpecialization: r.doctor?.specialization || "",
    }));

    // ------------------- Chart Data (last 7 days) -------------------
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
        pending: dayCompliance.totalPending || 0,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // ------------------- Metrics -------------------
    const totalTaken = chartData.reduce((sum, d) => sum + d.taken, 0);
    const totalExpected = chartData.reduce(
      (sum, d) => sum + d.taken + d.missed + d.pending,
      0
    );
    const adherencePercent = totalExpected
      ? Math.round((totalTaken / totalExpected) * 100)
      : 0;

    // ------------------- Return -------------------
    return NextResponse.json({
      success: true,
      user,
      loggedInUser,
      medications: medicationsData,
      reports,
      chartData,
      metrics: { adherencePercent },
    });
  } catch (err) {
    console.error("Dashboard GET error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
