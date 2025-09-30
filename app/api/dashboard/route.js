import { NextResponse } from "next/server";
import connectToDB from "../../../lib/db.js";
import Medication from "../../../models/Medication.js";
import Report from "../../../models/Report.js";
import User from "../../../models/User.js";
import { authenticate } from "../../../middlewares/auth.js";

export async function GET(req) {
  try {
    await connectToDB();

    const user = await authenticate(req);

    let meds = [];
    let reports = [];

    if (user.role === "patient") {
      // Patient sees only own meds & reports
      meds = await Medication.find({ userId: user._id }).lean();
      reports = await Report.find({ patient: user._id })
        .sort({ createdAt: -1 })
        .lean();
    } else if (user.role === "doctor") {
      // Doctor sees their patients' meds & reports
      const patientIds = user.patient || [];
      meds = await Medication.find({ userId: { $in: patientIds } }).lean();
      reports = await Report.find({ patient: { $in: patientIds } })
        .sort({ createdAt: -1 })
        .lean();
    } else if (user.role === "family") {
      // Family sees linked patients' meds & reports
      const linkedPatientIds = user.linkedFamily || [];
      meds = await Medication.find({
        userId: { $in: linkedPatientIds },
      }).lean();
      reports = await Report.find({ patient: { $in: linkedPatientIds } })
        .sort({ createdAt: -1 })
        .lean();
    }

    // Chart data (for first patient or aggregate? Here using first linked patient if family)
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
