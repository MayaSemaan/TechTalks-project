import { NextResponse } from "next/server";
import connectToDB from "../../../../lib/db.js";
import Medication from "../../../../models/Medication.js";
import Report from "../../../../models/Report.js";
import User from "../../../../models/User.js";
import { calculateCompliance } from "../../../../lib/complianceHelper.js";
import { authenticate } from "../../../../middlewares/auth.js";

function isMedicationForToday(med) {
  const today = new Date();
  const start = new Date(med.startDate);
  const end = med.endDate ? new Date(med.endDate) : null;

  // Normalize to date-only (ignore timezone)
  const todayDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const startDate = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );

  if (isNaN(start)) return false;
  if (end && todayDate > end) return false;
  if (todayDate < startDate) return false;

  const diffDays = Math.floor((todayDate - startDate) / (1000 * 60 * 60 * 24));

  switch (med.schedule) {
    case "daily":
      return true;

    case "weekly":
      return todayDate.getDay() === startDate.getDay();

    case "monthly": {
      const monthsDiff =
        (todayDate.getFullYear() - startDate.getFullYear()) * 12 +
        (todayDate.getMonth() - startDate.getMonth());
      return (
        monthsDiff >= 0 &&
        monthsDiff % 1 === 0 && // every 1 month
        todayDate.getDate() === startDate.getDate()
      );
    }

    case "custom":
      const interval = med.customInterval?.number || 1;
      const unit = med.customInterval?.unit || "day";
      if (unit === "day") return diffDays % interval === 0;
      if (unit === "week") return diffDays % (7 * interval) === 0;
      if (unit === "month") {
        const monthsDiff =
          (todayDate.getFullYear() - startDate.getFullYear()) * 12 +
          (todayDate.getMonth() - startDate.getMonth());
        return (
          monthsDiff >= 0 &&
          monthsDiff % interval === 0 &&
          todayDate.getDate() === startDate.getDate()
        );
      }

      return false;

    default:
      return false;
  }
}

export async function GET(req, { params }) {
  try {
    await connectToDB();
    const { userId } = params;
    const { searchParams } = new URL(req.url);

    let loggedInUser = null;
    try {
      loggedInUser = await authenticate(req);
    } catch {
      loggedInUser = { role: "guest" };
    }

    const user = await User.findById(userId).select("name email role");
    if (!user)
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );

    const statusFilter = searchParams.get("status");
    const medFromDate = searchParams.get("fromDate");
    const medToDate = searchParams.get("toDate");

    const medications = await Medication.find({ userId });

    const medicationsData = medications.map((med) => {
      // filter doses by query params
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

      // ✅ If no dose exists for today but med should appear today → add a pending dose
      const todayStr = new Date().toDateString();
      const hasTodayDose = med.doses.some(
        (d) => new Date(d.date).toDateString() === todayStr
      );

      if (!hasTodayDose && isMedicationForToday(med)) {
        med.times.forEach((time) => {
          filteredDoses.push({
            doseId: `temp-${Math.random().toString(36).substring(2, 9)}`,
            date: new Date(),
            time,
            taken: null,
          });
        });
      }

      const dosesTaken = med.doses.filter((d) => d.taken === true).length;
      const dosesMissed = med.doses.filter((d) => d.taken === false).length;
      const dosesPending = med.doses.filter((d) => d.taken === null).length;
      const totalDoses = med.doses.length;
      const compliance = totalDoses ? (dosesTaken / totalDoses) * 100 : 0;

      return {
        _id: med._id,
        name: med.name,
        dosage: med.dosage,
        unit: med.unit,
        type: med.type,
        schedule: med.schedule,
        customInterval: med.customInterval || null,
        startDate: med.startDate ? med.startDate.toISOString() : null,
        endDate: med.endDate ? med.endDate.toISOString() : null,
        times: Array.isArray(med.times) ? med.times : [],
        reminders: med.reminders,
        notes: med.notes,
        dosesTaken,
        dosesMissed,
        dosesPending,
        compliance: parseFloat(compliance.toFixed(2)),
        filteredDoses,
        // ✅ Add this line:
        isForToday: isMedicationForToday(med),
      };
    });

    // Reports
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
    const reportsRaw = await Report.find(reportQuery).sort({ createdAt: -1 });
    const reports = reportsRaw.map((r) => ({
      _id: r._id,
      title: r.title,
      fileUrl: r.fileUrl,
      uploadedAt: r.createdAt ? r.createdAt.toISOString() : null,
    }));

    // Chart data (unchanged)
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

    const totalTaken = chartData.reduce((sum, d) => sum + d.taken, 0);
    const totalDoses = chartData.reduce(
      (sum, d) => sum + d.taken + d.missed,
      0
    );
    const adherencePercent = totalDoses
      ? Math.round((totalTaken / totalDoses) * 100)
      : 0;

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
