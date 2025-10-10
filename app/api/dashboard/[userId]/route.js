// app/api/dashboard/[userId]/route.js
import { NextResponse } from "next/server";
import connectToDB from "../../../../lib/db.js";
import Medication from "../../../../models/Medication.js";
import Report from "../../../../models/Report.js";

export async function GET(req, { params }) {
  try {
    await connectToDB();

    const { userId } = params; // ✅ params is already resolved

    // Fetch medications and reports for the given userId
    const medications = await Medication.find({ userId });
    const reports = await Report.find({ patient: userId }); // assuming patient field is correct

    return NextResponse.json({
      medications: medications || [],
      reports: reports || [],
    });
  } catch (err) {
    console.error("Dashboard GET error:", err);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
