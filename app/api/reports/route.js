import { NextResponse } from "next/server";
import connectToDB from "../../../lib/db.js";
import Report from "../../../models/reports.js";
import User from "../../../models/User.js";
import mongoose from "mongoose";
import formidable from "formidable";
import fs from "fs";
import path from "path";

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Connect to MongoDB
await connectToDB();

// Helper function to save uploaded files
const saveFile = (file) => {
  const uploadDir = path.join(process.cwd(), "public/uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const fileName = `${Date.now()}_${file.originalFilename}`;
  const filePath = path.join(uploadDir, fileName);
  fs.renameSync(file.filepath, filePath);

  return `/uploads/${fileName}`;
};

// JSON POST endpoint (simple report creation)
export async function POST(req) {
  try {
    // Check if request is JSON or multipart/form-data
    if (req.headers.get("content-type")?.includes("application/json")) {
      const data = await req.json();

      // Check doctor and patient exist
      const doctor = await User.findById(data.doctor);
      if (!doctor)
        return NextResponse.json(
          { error: "Doctor not found" },
          { status: 404 }
        );

      const patient = await User.findById(data.patient);
      if (!patient)
        return NextResponse.json(
          { error: "Patient not found" },
          { status: 404 }
        );

      // Create report
      const report = await Report.create(data);

      // Populate
      await report.populate("doctor", "name role");
      await report.populate("patient", "name role");

      return NextResponse.json(report, { status: 201 });
    } else {
      // Handle file upload with formidable
      const form = formidable({ multiples: false });
      const data = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          else resolve({ fields, files });
        });
      });

      const { title, description, patient, doctor } = data.fields;
      const file = data.files.file;

      if (!title || !description || !patient || !file || !doctor) {
        return NextResponse.json(
          { error: "All fields are required" },
          { status: 400 }
        );
      }

      const fileUrl = saveFile(file);

      const report = await Report.create({
        doctor: new mongoose.Types.ObjectId(doctor),
        patient: new mongoose.Types.ObjectId(patient),
        title,
        description,
        fileUrl,
      });

      await report.populate("doctor patient");

      return NextResponse.json(report, { status: 201 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET endpoint to fetch reports
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
