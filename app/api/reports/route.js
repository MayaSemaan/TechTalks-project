import { NextResponse } from "next/server";
import connectDB from "../../../utils/dbConnect.js";
import Report from "../../models/reports.js";
import User from "../../models/user.js";

// Connect to MongoDB
await connectDB();

export async function POST(req) {
  try {
    const data = await req.json();

    // Check doctor and patient exist
    const doctor = await User.findById(data.doctor);
    if (!doctor)
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

    const patient = await User.findById(data.patient);
    if (!patient)
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    // Create report
    const report = await Report.create(data);

    // Populate
    await report.populate("doctor", "name role");
    await report.populate("patient", "name role");

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const reports = await Report.find()
      .populate("doctor", "name role")
      .populate("patient", "name role");

    return NextResponse.json(reports, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
