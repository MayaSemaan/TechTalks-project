import { NextResponse } from "next/server";
import connectToDB from "../../../lib/db.js";
import Report from "../../../models/Report.js";
import { authenticate } from "../../../middlewares/auth.js";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

export const config = { api: { bodyParser: false } };

const saveFile = (file) => {
  const uploadDir = path.join(process.cwd(), "public/uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const fileName = `${Date.now()}_${file.originalFilename}`;
  const filePath = path.join(uploadDir, fileName);
  fs.renameSync(file.filepath, filePath);
  return `/uploads/${fileName}`;
};

export async function GET(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    let reports;
    if (user.role === "family") {
      reports = await Report.find({ patient: { $in: user.linkedFamily } })
        .populate("doctor", "name role")
        .populate("patient", "name role");
    } else if (user.role === "doctor") {
      reports = await Report.find({ doctor: user._id })
        .populate("doctor", "name role")
        .populate("patient", "name role");
    } else {
      reports = await Report.find({ patient: user._id })
        .populate("doctor", "name role")
        .populate("patient", "name role");
    }

    return NextResponse.json(reports);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    if (req.headers.get("content-type")?.includes("application/json")) {
      const data = await req.json();

      // Family must specify linked patient
      if (user.role === "family") {
        if (!data.patient || !user.linkedFamily.includes(data.patient)) {
          return NextResponse.json(
            { error: "Unauthorized or missing patient" },
            { status: 403 }
          );
        }
      } else if (user.role === "patient") {
        data.patient = user._id;
      } else if (user.role === "doctor") {
        data.doctor = user._id;
      }

      const report = await Report.create(data);
      await report.populate("doctor patient");
      return NextResponse.json(report, { status: 201 });
    } else {
      const form = formidable({ multiples: false });
      const data = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) =>
          err ? reject(err) : resolve({ fields, files })
        );
      });

      const { title, description, patient } = data.fields;
      const file = data.files.file;

      if (!title || !description || !patient || !file)
        return NextResponse.json(
          { error: "All fields required" },
          { status: 400 }
        );

      // Family validation
      if (user.role === "family" && !user.linkedFamily.includes(patient)) {
        return NextResponse.json(
          { error: "Unauthorized patient" },
          { status: 403 }
        );
      }

      const fileUrl = saveFile(file);

      const report = await Report.create({
        doctor: user.role === "doctor" ? user._id : null,
        patient: new mongoose.Types.ObjectId(patient),
        title,
        description,
        fileUrl,
      });

      await report.populate("doctor patient");
      return NextResponse.json(report, { status: 201 });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
