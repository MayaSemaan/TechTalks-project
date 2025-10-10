import { NextResponse } from "next/server";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import connectToDB from "../../../lib/db.js";
import Report from "../../../models/Report.js";
import { authenticate } from "../../../middlewares/auth.js";
import { sendNotification } from "../../utils/sendNotification.js";

export const config = { api: { bodyParser: false } };

// ✅ Save uploaded file
const saveFile = async (file) => {
  const uploadDir = path.join(process.cwd(), "public/uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const fileName = `${Date.now()}_${file.name}`;
  const filePath = path.join(uploadDir, fileName);

  await fs.promises.writeFile(filePath, buffer);
  return `/uploads/${fileName}`;
};

// ✅ GET reports visible to authenticated user
export async function GET(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    let reports = [];

    if (user.role === "family") {
      // Family sees reports of all linked patients
      const linkedPatientIds = user.linkedFamily.map((p) => p._id);
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
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// ✅ POST report (JSON or multipart/form-data)
export async function POST(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    if (user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const contentType = req.headers.get("content-type") || "";
    let report;

    if (contentType.includes("application/json")) {
      const data = await req.json();

      if (!data.patient || !data.title || !data.description) {
        return NextResponse.json(
          { error: "Patient, title, and description are required" },
          { status: 400 }
        );
      }

      data.doctor = user._id;
      report = await Report.create(data);
      await report.populate("doctor patient");
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const title = formData.get("title");
      const description = formData.get("description");
      const patient = formData.get("patient");
      const file = formData.get("file");

      if (!title || !description || !patient || !file) {
        return NextResponse.json(
          { error: "All fields required" },
          { status: 400 }
        );
      }

      const fileUrl = await saveFile(file);

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

    // ✅ Corrected link for new structure
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
    const reportLink = `${baseUrl}/reports/view/${report._id}`;

    // ✅ Send notifications
    if (report.doctor?.email) {
      try {
        await sendNotification(
          report.doctor.email,
          "New Patient Report Uploaded",
          `<p>Hello Dr. ${report.doctor.name},</p>
           <p>Report "<strong>${report.title}</strong>" uploaded for patient ${report.patient.name}.</p>
           <p><a href="${reportLink}" target="_blank">${reportLink}</a></p>`
        );
      } catch (err) {
        console.error("Doctor notification failed:", err);
      }
    }

    if (report.patient?.email) {
      try {
        await sendNotification(
          report.patient.email,
          "New Report Available",
          `<p>Hello ${report.patient.name},</p>
           <p>Report "<strong>${report.title}</strong>" uploaded by Dr. ${report.doctor.name}.</p>
           <p><a href="${reportLink}" target="_blank">${reportLink}</a></p>`
        );
      } catch (err) {
        console.error("Patient notification failed:", err);
      }
    }

    // ✅ Notify linked family members
    const User = mongoose.model("User");
    if (report.patient) {
      const familyMembers = await User.find({
        linkedFamily: report.patient._id,
      });
      for (const family of familyMembers) {
        if (family.email) {
          try {
            await sendNotification(
              family.email,
              "New Report Available for Patient",
              `<p>Hello ${family.name},</p>
               <p>A new report "<strong>${report.title}</strong>" is available for patient ${report.patient.name}.</p>
               <p><a href="${reportLink}" target="_blank">${reportLink}</a></p>`
            );
          } catch (err) {
            console.error(`Notification to family ${family.name} failed:`, err);
          }
        }
      }
    }

    return NextResponse.json(report, { status: 201 });
  } catch (err) {
    console.error("POST /api/reports error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
