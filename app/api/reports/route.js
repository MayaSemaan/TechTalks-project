import { NextResponse } from "next/server";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import connectToDB from "../../../lib/db.js";
import Report from "../../../models/Report.js";
import { authenticate } from "../../../middlewares/auth.js";
import { sendNotification } from "../../utils/sendNotification.js";

export const config = { api: { bodyParser: false } };

// Helper: Save uploaded file

const saveFile = async (file) => {
  const uploadDir = path.join(process.cwd(), "public/uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `${Date.now()}_${file.name}`;
  const filePath = path.join(uploadDir, fileName);

  await fs.promises.writeFile(filePath, buffer);
  return `/uploads/${fileName}`;
};

// GET reports

export async function GET(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    let reports = [];

    if (user.role === "family") {
      // Family sees reports of their linked patients
      const linkedPatientIds =
        user.linkedPatients?.map((p) => p._id || p) || [];
      reports = await Report.find({ patient: { $in: linkedPatientIds } })
        .populate("doctor", "name role email")
        .populate("patient", "name role email");
    } else if (user.role === "doctor") {
      reports = await Report.find({ doctor: user._id })
        .populate("doctor", "name role email")
        .populate("patient", "name role email");
    } else if (user.role === "patient") {
      reports = await Report.find({ patient: user._id })
        .populate("doctor", "name role email")
        .populate("patient", "name role email");
    }

    return NextResponse.json(reports);
  } catch (err) {
    console.error("GET /api/reports error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST report (Create)

export async function POST(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    if (user.role !== "doctor") {
      console.warn(
        `❌ Upload blocked — user ${user._id} (${user.role}) tried to upload a report.`
      );
      return NextResponse.json(
        {
          error: `Forbidden: only doctors can upload reports (you are ${user.role})`,
        },
        { status: 403 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let report;

    if (contentType.includes("application/json")) {
      const data = await req.json();
      if (!data.patient || !data.title || !data.description)
        return NextResponse.json(
          { error: "Patient, title, and description are required" },
          { status: 400 }
        );

      data.doctor = user._id;
      report = await Report.create(data);
      await report.populate("doctor patient");
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const title = formData.get("title");
      const description = formData.get("description");
      const patient = formData.get("patient");
      const file = formData.get("file");

      if (!title || !description || !patient)
        return NextResponse.json(
          { error: "All fields required" },
          { status: 400 }
        );

      const fileUrl = file ? await saveFile(file) : null;

      report = await Report.create({
        doctor: user._id,
        patient: new mongoose.Types.ObjectId(patient),
        title,
        description,
        fileUrl,
      });
      await report.populate("doctor patient");
    } else {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
    const reportLink = `${baseUrl}/reports/view/${report._id}`;
    const User = mongoose.model("User");

    // Notify doctor
    if (report.doctor?.email)
      await sendNotification(
        report.doctor.email,
        "New Patient Report Uploaded",
        `<p>Hello Dr. ${report.doctor.name},</p>
         <p>Report "<strong>${report.title}</strong>" uploaded for patient ${report.patient.name}.</p>
         <p><a href="${reportLink}" target="_blank">${reportLink}</a></p>`
      );

    // Notify patient
    if (report.patient?.email)
      await sendNotification(
        report.patient.email,
        "New Report Available",
        `<p>Hello ${report.patient.name},</p>
         <p>Report "<strong>${report.title}</strong>" uploaded by Dr. ${report.doctor.name}.</p>
         <p><a href="${reportLink}" target="_blank">${reportLink}</a></p>`
      );

    // Notify linked family members
    const familyMembers = await User.find({
      role: "family",
      linkedPatients: report.patient._id,
    });

    for (const family of familyMembers) {
      if (family.email)
        await sendNotification(
          family.email,
          "New Report Available for Patient",
          `<p>Hello ${family.name},</p>
           <p>A new report "<strong>${report.title}</strong>" is available for patient ${report.patient.name}.</p>
           <p><a href="${reportLink}" target="_blank">${reportLink}</a></p>`
        );
    }

    return NextResponse.json(report, { status: 201 });
  } catch (err) {
    console.error("POST /api/reports error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT report (Update)

export async function PUT(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    if (user.role !== "doctor")
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const data = await req.json();
    if (!data._id)
      return NextResponse.json(
        { error: "Report ID required" },
        { status: 400 }
      );

    const updated = await Report.findByIdAndUpdate(data._id, data, {
      new: true,
    }).populate("doctor patient");

    if (!updated)
      return NextResponse.json({ error: "Report not found" }, { status: 404 });

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
    const reportLink = `${baseUrl}/reports/view/${updated._id}`;
    const User = mongoose.model("User");

    // Notify patient
    if (updated.patient?.email)
      await sendNotification(
        updated.patient.email,
        "Report Updated",
        `<p>Hello ${updated.patient.name},</p>
         <p>Your report "<strong>${updated.title}</strong>" was updated by Dr. ${updated.doctor.name}.</p>
         <p><a href="${reportLink}" target="_blank">${reportLink}</a></p>`
      );

    // Notify linked family
    const familyMembers = await User.find({
      role: "family",
      linkedPatients: updated.patient._id,
    });

    for (const family of familyMembers) {
      if (family.email)
        await sendNotification(
          family.email,
          "Patient Report Updated",
          `<p>Hello ${family.name},</p>
           <p>Report "<strong>${updated.title}</strong>" for ${updated.patient.name} was updated by Dr. ${updated.doctor.name}.</p>
           <p><a href="${reportLink}" target="_blank">${reportLink}</a></p>`
        );
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("PUT /api/reports error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
