import { NextResponse } from "next/server";
import connectToDB from "../../../lib/db.js";
import Medication from "../../../models/Medication.js";
import Report from "../../../models/Report.js";
import User from "../../../models/User.js";
import { authenticate } from "../../../middlewares/auth.js";

export async function GET(req) {
  try {
    await connectToDB();

    let user;

    // Try to get token first (for Postman)
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      user = await authenticate(req); // authenticate with token
    } else {
      // Fallback for browser: get userId from query param
      const url = new URL(req.url);
      const userId = url.searchParams.get("userId");
      if (!userId) throw new Error("No userId or token provided");

      user = await User.findById(userId);
      if (!user) throw new Error("User not found");
    }

    // Get meds and reports
    const meds = await Medication.find({ userId: user._id }).lean();
    const reports = await Report.find({ patient: user._id })
      .sort({ createdAt: -1 })
      .lean();

    // Chart data
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
