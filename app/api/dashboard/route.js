import { NextResponse } from "next/server";
import connectToDB from "../../../lib/db.js";
import Medication from "../../../models/Medication.js";
import Report from "../../../models/Report.js";
import { authenticate } from "../../../middlewares/auth.js";

export async function GET(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    const meds = await Medication.find({ userId: user._id }).lean();
    const reports = await Report.find({ patient: user._id })
      .sort({ createdAt: -1 })
      .lean();

    const chartData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split("T")[0],
        taken: Math.floor(Math.random() * 3),
        missed: Math.floor(Math.random() * 2),
      };
    }).reverse();

    const totalTaken = chartData.reduce((sum, l) => sum + l.taken, 0);
    const totalPrescribed = chartData.reduce(
      (sum, l) => sum + l.taken + l.missed,
      0
    );
    const adherencePercent = totalPrescribed
      ? Math.round((totalTaken / totalPrescribed) * 100)
      : null;

    return NextResponse.json({
      meds,
      reports,
      chartData,
      metrics: { adherencePercent },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
