import { NextResponse } from "next/server";
import connectToDB from "../../../../lib/db.js";
import Report from "../../../../models/reports.js";

// Connect to MongoDB
await connectToDB();

export async function GET(req, { params }) {
  try {
    const { id } = params;
    const report = await Report.findById(id)
      .populate("doctor", "name role")
      .populate("patient", "name role");

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const updateData = await req.json();

    const report = await Report.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!report)
      return NextResponse.json({ error: "Report not found" }, { status: 404 });

    await report.populate("doctor", "name role");
    await report.populate("patient", "name role");

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    const report = await Report.findByIdAndDelete(id);

    if (!report)
      return NextResponse.json({ error: "Report not found" }, { status: 404 });

    return NextResponse.json({ message: "Report deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
