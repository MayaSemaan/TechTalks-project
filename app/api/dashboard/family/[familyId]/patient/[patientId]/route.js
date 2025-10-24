import { NextResponse } from "next/server";
import connectToDB from "../../../../../../../lib/db.js";
import User from "../../../../../../../models/User.js";
import Medication from "../../../../../../../models/Medication.js";
import Report from "../../../../../../../models/Report.js";
import { authenticate } from "../../../../../../../middlewares/auth.js";

// ✅ Utility to check if two dates are the same day
const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// ✅ Generate doses for a selected day respecting schedule
const generateDosesForDay = (med, day) => {
  const selected = new Date(day);
  selected.setHours(0, 0, 0, 0);

  const start = med.startDate ? new Date(med.startDate) : null;
  const end = med.endDate ? new Date(med.endDate) : null;

  if (start && selected < new Date(start.setHours(0, 0, 0, 0))) return [];
  if (end && selected > new Date(end.setHours(0, 0, 0, 0))) return [];

  let shouldTake = false;

  switch (med.schedule) {
    case "daily":
      shouldTake = true;
      break;
    case "weekly":
      if (start) {
        shouldTake = selected.getDay() === new Date(start).getDay();
      }
      break;
    case "monthly":
      if (start) {
        shouldTake = selected.getDate() === new Date(start).getDate();
      }
      break;
    case "custom":
      if (start && med.customInterval) {
        const { number = 1, unit = "day" } = med.customInterval;
        let diff = 0;
        if (unit === "day") {
          diff = Math.floor(
            (selected - new Date(start.setHours(0, 0, 0, 0))) /
              (1000 * 60 * 60 * 24)
          );
          shouldTake = diff % number === 0;
        } else if (unit === "week") {
          diff = Math.floor(
            (selected - new Date(start.setHours(0, 0, 0, 0))) /
              (1000 * 60 * 60 * 24 * 7)
          );
          shouldTake = diff % number === 0;
        } else if (unit === "month") {
          const startDate = new Date(start);
          const monthsDiff =
            selected.getFullYear() * 12 +
            selected.getMonth() -
            (startDate.getFullYear() * 12 + startDate.getMonth());
          shouldTake =
            monthsDiff % number === 0 &&
            selected.getDate() === startDate.getDate();
        }
      }
      break;
    default:
      shouldTake = false;
  }

  if (!shouldTake) return [];

  return (med.times || []).map((time, idx) => ({
    doseId: `${selected.toISOString()}-${idx}`,
    date: selected.toISOString(),
    time,
    taken: null,
  }));
};

export async function GET(req, { params }) {
  try {
    const loggedUser = await authenticate(req);
    await connectToDB();

    const { patientId } = params;
    const patient = await User.findById(patientId).select(
      "name email role linkedFamily"
    );
    if (!patient)
      return NextResponse.json(
        { success: false, message: "Patient not found" },
        { status: 404 }
      );

    if (
      loggedUser.role === "family" &&
      !patient.linkedFamily.includes(loggedUser._id)
    ) {
      return NextResponse.json(
        { success: false, message: "Not authorized" },
        { status: 403 }
      );
    }

    const medications = await Medication.find({ userId: patient._id }).lean();
    const reports = await Report.find({ patient: patient._id })
      .populate("doctor", "name email")
      .lean();

    // Ensure each med has customInterval and doses initialized
    const meds = medications.map((m) => ({
      ...m,
      customInterval: m.customInterval || { number: 1, unit: "day" },
      doses: m.doses || [],
      filteredDoses: m.doses || [],
    }));

    reports.forEach((r) => {
      r.uploadedAt = r.uploadedAt || r.createdAt || r.date || null;
    });

    // ✅ Compute adherence for last 7 days
    const now = new Date();
    const adherenceByDay = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      adherenceByDay[date.toISOString().split("T")[0]] = {
        taken: 0,
        missed: 0,
        total: 0,
      };
    }

    for (const med of meds) {
      const allDoses = [...(med.doses || [])];

      for (let i = 0; i < 7; i++) {
        const day = new Date();
        day.setDate(now.getDate() - i);
        const generated = generateDosesForDay(med, day);
        allDoses.push(...generated);
      }

      for (const dose of allDoses) {
        const d = new Date(dose.date);
        const key = d.toISOString().split("T")[0];
        if (adherenceByDay[key]) {
          adherenceByDay[key].total++;
          if (dose.taken === true) adherenceByDay[key].taken++;
          else if (dose.taken === false) adherenceByDay[key].missed++;
        }
      }
    }

    const chartData = Object.keys(adherenceByDay)
      .sort()
      .map((key) => {
        const { taken, missed, total } = adherenceByDay[key];
        return {
          date: new Date(key).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          }),
          taken,
          missed,
          total,
        };
      });

    const totals = Object.values(adherenceByDay).reduce(
      (acc, d) => ({ taken: acc.taken + d.taken, total: acc.total + d.total }),
      { taken: 0, total: 0 }
    );
    const adherencePercent =
      totals.total > 0 ? ((totals.taken / totals.total) * 100).toFixed(1) : 0;

    return NextResponse.json({
      success: true,
      data: {
        user: patient,
        medications: meds,
        reports,
        adherence: adherencePercent,
        chartData,
      },
    });
  } catch (error) {
    console.error("❌ Family patient dashboard error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 }
    );
  }
}
