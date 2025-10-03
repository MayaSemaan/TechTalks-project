// app/api/dashboard/[userId]/route.js
import { NextResponse } from "next/server";
import connectToDB from "../../../../lib/db.js";
import Medication from "../../../../models/Medication.js";
import Report from "../../../../models/Report.js";

export async function GET(req, { params }) {
  try {
    await connectToDB();

    // unwrap params (Next.js 14+)
    const resolvedParams = await params;
    const { userId } = resolvedParams;

    const medications = await Medication.find({ userId });
    const reports = await Report.find({ patientId: userId });

    return NextResponse.json({ medications, reports });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
