import { NextResponse } from "next/server";
import connectToDB from "../../../../lib/db.js";
import Report from "../../../../models/Report.js";
import { authenticate } from "../../../../middlewares/auth.js";
import mongoose from "mongoose";

// GET a single report
export async function GET(req, { params }) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    const report = await Report.findById(params.reportId)
      .populate("doctor", "name role")
      .populate("patient", "name role");

    if (!report)
      return NextResponse.json({ error: "Report not found" }, { status: 404 });

    // Allow access for doctor, patient, or linked family
    const isDoctor = report.doctor._id.equals(user._id);
    const isPatient = report.patient._id.equals(user._id);
    const isFamily =
      user.role === "family" && user.patient.includes(report.patient._id);

    if (!isDoctor && !isPatient && !isFamily) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT - update a report (doctor only)
export async function PUT(req, { params }) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    if (user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await req.json();

    const report = await Report.findOneAndUpdate(
      { _id: params.reportId, doctor: user._id },
      data,
      { new: true }
    );

    if (!report)
      return NextResponse.json(
        { error: "Report not found or unauthorized" },
        { status: 404 }
      );

    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE - delete a report (doctor only)
export async function DELETE(req, { params }) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    if (user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const report = await Report.findOneAndDelete({
      _id: params.reportId,
      doctor: user._id,
    });

    if (!report)
      return NextResponse.json(
        { error: "Report not found or unauthorized" },
        { status: 404 }
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
