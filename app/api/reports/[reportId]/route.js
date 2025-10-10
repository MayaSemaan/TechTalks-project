import { NextResponse } from "next/server";
import connectToDB from "../../../../lib/db.js";
import Report from "../../../../models/Report.js";
import { authenticate } from "../../../../middlewares/auth.js";
import { sendNotification } from "../../../utils/sendNotification.js";

// ------------------------
// GET a single report
// ------------------------
export async function GET(req, context) {
  const { params } = context; // ✅ properly destructure params
  try {
    const user = await authenticate(req);
    await connectToDB();

    const report = await Report.findById(params.reportId)
      .populate("doctor", "name role email")
      .populate("patient", "name role email");

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const isDoctor = report.doctor._id.equals(user._id);
    const isPatient = report.patient._id.equals(user._id);
    const isFamily =
      user.role === "family" && user.linkedFamily?.includes(report.patient._id);

    if (!isDoctor && !isPatient && !isFamily) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(report);
  } catch (err) {
    console.error("GET /api/reports/[reportId] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ------------------------
// PUT, DELETE, POST remain unchanged
// ------------------------
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
    ).populate("doctor patient");

    if (!report) {
      return NextResponse.json(
        { error: "Report not found or unauthorized" },
        { status: 404 }
      );
    }

    // Notify doctor
    if (report.doctor?.email) {
      try {
        await sendNotification(
          report.doctor.email,
          "Report Updated",
          `<p>Hello Dr. ${report.doctor.name},</p>
           <p>The report titled "<strong>${report.title}</strong>" for patient ${report.patient.name} has been updated.</p>
           <p><a href="${process.env.NEXT_PUBLIC_API_BASE}/reports/view/${report._id}" target="_blank">View Report</a></p>`
        );
      } catch (err) {
        console.error("Failed to send doctor update notification:", err);
      }
    }

    // Notify patient
    if (report.patient?.email) {
      try {
        await sendNotification(
          report.patient.email,
          "Your Report Has Been Updated",
          `<p>Hello ${report.patient.name},</p>
           <p>Your report titled "<strong>${report.title}</strong>" has been updated by Dr. ${report.doctor.name}.</p>
           <p><a href="${process.env.NEXT_PUBLIC_API_BASE}/reports/view/${report._id}" target="_blank">View Report</a></p>`
        );
      } catch (err) {
        console.error("Failed to send patient update notification:", err);
      }
    }

    return NextResponse.json(report);
  } catch (err) {
    console.error("PUT /api/reports/[reportId] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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

    if (!report) {
      return NextResponse.json(
        { error: "Report not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/reports/[reportId] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    if (user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await req.json();

    if (!data.patient || !data.title || !data.description) {
      return NextResponse.json(
        { error: "Patient, title, and description are required" },
        { status: 400 }
      );
    }

    data.doctor = user._id;

    const report = await Report.create(data);
    await report.populate("doctor patient");

    // Notify doctor
    if (report.doctor?.email) {
      try {
        await sendNotification(
          report.doctor.email,
          "New Report Created",
          `<p>Hello Dr. ${report.doctor.name},</p>
           <p>A new report titled "<strong>${report.title}</strong>" has been created for patient ${report.patient.name}.</p>
           <p><a href="${process.env.NEXT_PUBLIC_API_BASE}/reports/view/${report._id}" target="_blank">View Report</a></p>`
        );
      } catch (err) {
        console.error("Failed to send doctor notification:", err);
      }
    }

    // Notify patient
    if (report.patient?.email) {
      try {
        await sendNotification(
          report.patient.email,
          "New Report Available",
          `<p>Hello ${report.patient.name},</p>
           <p>A new report titled "<strong>${report.title}</strong>" has been uploaded by Dr. ${report.doctor.name}.</p>
           <p><a href="${process.env.NEXT_PUBLIC_API_BASE}/reports/view/${report._id}" target="_blank">View Report</a></p>`
        );
      } catch (err) {
        console.error("Failed to send patient notification:", err);
      }
    }

    return NextResponse.json(report, { status: 201 });
  } catch (err) {
    console.error("POST /api/reports/[reportId] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
