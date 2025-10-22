import { NextResponse } from "next/server";
import connectToDB from "../../../../../../../lib/db.js";
import User from "../../../../../../../models/User.js";
import Medication from "../../../../../../../models/Medication.js";
import Report from "../../../../../../../models/Report.js";
import { authenticate } from "../../../../../../../middlewares/auth.js";

export async function GET(req, { params }) {
  try {
    // 1️⃣ Authenticate
    const loggedUser = await authenticate(req);
    await connectToDB();

    const { patientId } = params;

    // 2️⃣ Get patient
    const patient = await User.findById(patientId).select(
      "name email role linkedFamily"
    );
    if (!patient)
      return NextResponse.json(
        { success: false, message: "Patient not found" },
        { status: 404 }
      );

    // 3️⃣ Authorization check
    if (
      loggedUser.role === "family" &&
      !patient.linkedFamily.includes(loggedUser._id)
    ) {
      return NextResponse.json(
        { success: false, message: "Not authorized" },
        { status: 403 }
      );
    }

    // 4️⃣ Fetch data
    const medications = await Medication.find({ userId: patient._id });
    const reports = await Report.find({ patient: patient._id })
      .populate("doctor", "name email")
      .lean();

    // Normalize date fields
    reports.forEach((r) => {
      r.uploadedAt = r.uploadedAt || r.createdAt || r.date || null;
    });

    // 5️⃣ Compute adherence for last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6); // include today

    const adherenceByDay = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      const key = date.toISOString().split("T")[0];
      adherenceByDay[key] = { taken: 0, missed: 0, total: 0 };
    }

    for (const med of medications) {
      for (const dose of med.doses || []) {
        const d = new Date(dose.date);
        const key = d.toISOString().split("T")[0];
        if (adherenceByDay[key]) {
          adherenceByDay[key].total++;
          if (dose.taken === true) adherenceByDay[key].taken++;
          else if (dose.taken === false) adherenceByDay[key].missed++;
        }
      }
    }

    // 6️⃣ Format chart data for Recharts (LineChart)
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

    // 7️⃣ Calculate overall adherence
    const totals = Object.values(adherenceByDay).reduce(
      (acc, d) => ({
        taken: acc.taken + d.taken,
        total: acc.total + d.total,
      }),
      { taken: 0, total: 0 }
    );

    const adherencePercent =
      totals.total > 0 ? ((totals.taken / totals.total) * 100).toFixed(1) : 0;

    // 8️⃣ Respond
    return NextResponse.json({
      success: true,
      data: {
        user: patient,
        medications,
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
