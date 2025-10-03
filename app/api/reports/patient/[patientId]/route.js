import { NextResponse } from "next/server";
import connectToDB from "../../../../../lib/db.js";
import Report from "../../../../../models/Report.js";

export async function GET(req, { params }) {
  try {
    await connectToDB();
    const { patientId } = params;

    const reports = await Report.find({ patientId });
    return NextResponse.json(reports);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
