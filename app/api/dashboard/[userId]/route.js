import { NextResponse } from "next/server";
import connectToDB from "../../../../lib/db.js";
import Medication from "../../../../models/Medication.js";
import Report from "../../../../models/Report.js";
import User from "../../../../models/User.js";
import { calculateCompliance } from "../../../../lib/complianceHelper.js";
import { authenticate } from "../../../../middlewares/auth.js";

// ---------- Helper: check if med should be taken on a given date ----------
function isMedicationForDate(med, date) {
  const start = new Date(med.startDate);
  const end = med.endDate ? new Date(med.endDate) : null;
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startDate = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );

  if (isNaN(start)) return false;
  if (end && d > end) return false;
  if (d < startDate) return false;

  const diffDays = Math.floor((d - startDate) / (1000 * 60 * 60 * 24));

  switch (med.schedule) {
    case "daily":
      return true;
    case "weekly":
      return d.getDay() === startDate.getDay();
    case "monthly":
      return d.getDate() === startDate.getDate();
    case "custom":
      const number = med.customInterval?.number || 1;
      const unit = med.customInterval?.unit || "day";
      if (unit === "day") return diffDays % number === 0;
      if (unit === "week")
        return (
          Math.floor(diffDays / 7) % number === 0 &&
          d.getDay() === startDate.getDay()
        );
      if (unit === "month") {
        const monthsDiff =
          (d.getFullYear() - startDate.getFullYear()) * 12 +
          (d.getMonth() - startDate.getMonth());
        return monthsDiff % number === 0 && d.getDate() === startDate.getDate();
      }
      return false;
    default:
      return false;
  }
}

// ---------- Helper: generate doses for a med on a selected day ----------
function getFilteredDosesForMed(med, selectedDate) {
  if (!med || !med.times?.length) return [];

  const date = new Date(selectedDate);
  date.setHours(0, 0, 0, 0);
  const dayStr = date.toISOString().split("T")[0];

  // Check if medication occurs on this day
  if (!isMedicationForDate(med, date)) return [];

  // Generate doses and preserve existing backend statuses
  return med.times.map((time, idx) => {
    const doseId = `${med._id}-${idx}-${dayStr}`;

    const existingDose = med.doses?.find(
      (d) =>
        d.doseId === doseId &&
        new Date(d.date).toDateString() === date.toDateString()
    );

    return {
      doseId,
      date: date.toISOString(),
      time,
      taken: existingDose?.taken ?? null, // preserves taken/missed
    };
  });
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

    const medications = await Medication.find({ userId });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const medicationsData = [];
    for (const med of medications) {
      const medObj = med.toObject();

      // Generate today’s doses without overwriting existing doses
      const todayDoses = getFilteredDosesForMed(medObj, today);

      // Merge generated doses with DB doses (if missing, append)
      let updated = false;
      for (const td of todayDoses) {
        if (!medObj.doses?.some((d) => d.doseId === td.doseId)) {
          medObj.doses.push(td);
          updated = true;
        }
      }

      if (updated) {
        await Medication.updateOne(
          { _id: medObj._id },
          { $set: { doses: medObj.doses } }
        );
      }

      // Build filteredDoses for frontend (today only)
      const filteredDoses = medObj.doses.filter(
        (d) => new Date(d.date).toDateString() === today.toDateString()
      );

      const dosesTaken = filteredDoses.filter((d) => d.taken === true).length;
      const dosesMissed = filteredDoses.filter((d) => d.taken === false).length;
      const dosesPending = filteredDoses.filter((d) => d.taken === null).length;
      const totalDoses = filteredDoses.length;
      const compliance = totalDoses ? (dosesTaken / totalDoses) * 100 : 0;

      medicationsData.push({
        ...medObj,
        filteredDoses,
        dosesTaken,
        dosesMissed,
        dosesPending,
        compliance: parseFloat(compliance.toFixed(2)),
        isForToday: isMedicationForDate(medObj, today),
      });
    }

    // Reports
    const reportsRaw = await Report.find({ patient: userId }).sort({
      createdAt: -1,
    });
    const reports = reportsRaw.map((r) => ({
      _id: r._id,
      title: r.title,
      fileUrl: r.fileUrl,
      uploadedAt: r.createdAt ? r.createdAt.toISOString() : null,
    }));

    // Chart Data
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
