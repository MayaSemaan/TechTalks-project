import { NextResponse } from "next/server";
import connectToDB from "../../../../../lib/db.js";
import Report from "../../../../../models/Report.js";
import { authenticate } from "../../../../../middlewares/auth.js";

export async function GET(req, { params }) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    const { reportId } = params;

    const report = await Report.findById(reportId)
      .populate("doctor", "name role email")
      .populate("patient", "name role email");

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const isDoctor = report.doctor._id.equals(user._id);
    const isPatient = report.patient._id.equals(user._id);
    const isFamily =
      user.role === "family" &&
      Array.isArray(user.linkedPatients) &&
      user.linkedPatients.some((id) => id.equals(report.patient._id));

    if (!isDoctor && !isPatient && !isFamily) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(report);
  } catch (err) {
    console.error("GET /api/reports/view/[reportId] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
