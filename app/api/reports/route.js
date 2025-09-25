import { NextResponse } from "next/server";
import connectToDB from "../../../lib/db.js";
import Report from "../../../models/Report.js";
import { authenticate } from "../../middlewares/auth.js";
import mongoose from "mongoose";
import formidable from "formidable";
import fs from "fs";
import path from "path";

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

    const reports = await Report.find({
      $or: [{ doctor: user._id }, { patient: user._id }],
    })
      .populate("doctor", "name role")
      .populate("patient", "name role");

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
      data.doctor = user._id;
      const report = await Report.create(data);
      await report.populate("doctor patient");
      return NextResponse.json(report, { status: 201 });
    } else {
      const form = formidable({ multiples: false });
      const { fields, files } = await new Promise((resolve, reject) => {
        form.parse(req, (err, flds, fls) =>
          err ? reject(err) : resolve({ fields: flds, files: fls })
        );
      });

      const fileUrl = saveFile(files.file);
      const report = await Report.create({
        ...fields,
        doctor: user._id,
        patient: fields.patient,
        fileUrl,
      });

      await report.populate("doctor patient");
      return NextResponse.json(report, { status: 201 });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// PUT & DELETE same as medications, create /[id]/route.js
