import { NextResponse } from "next/server";
import connectToDB from "../../../../../lib/db.js";
import Report from "../../../../../models/Report.js";

export async function GET(req, { params }) {
  try {
    await connectToDB();
    const { patientId } = params;

    // ✅ FIX: correct field name (should be 'patient', not 'patientId')
    const reports = await Report.find({ patient: patientId })
      .populate("doctor", "name role email")
      .populate("patient", "name role email");

    return NextResponse.json(reports);
  } catch (err) {
    console.error("GET /api/reports/patient/[patientId] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
