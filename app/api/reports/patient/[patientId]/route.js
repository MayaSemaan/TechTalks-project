import { NextResponse } from "next/server";
import connectToDB from "../../../../../lib/db.js";
import Report from "../../../../../models/reports.js";

// Connect to MongoDB
await connectToDB();

export async function GET(req, { params }) {
  try {
    const { patientId } = params;
    const reports = await Report.find({ patient: patientId })
      .populate("doctor", "name role")
      .populate("patient", "name role");

    return NextResponse.json(reports, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
