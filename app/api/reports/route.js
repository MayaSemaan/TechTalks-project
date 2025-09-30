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
      // Family sees linked patients’ reports
      const linkedPatientIds = user.linkedFamily || [];
      reports = await Report.find({ patient: { $in: linkedPatientIds } })
        .populate("doctor", "name role")
        .populate("patient", "name role");
    } else {
      // Patient or doctor sees own reports
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
      const report = await Report.create({ ...data, doctor: user._id });
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

      const fileUrl = saveFile(file);

      const report = await Report.create({
        doctor: user._id,
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

export async function PUT(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();
    const { id, ...updates } = await req.json();

    if (!mongoose.Types.ObjectId.isValid(id))
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const report = await Report.findOneAndUpdate(
      { _id: id, doctor: user._id },
      updates,
      { new: true }
    );

    if (!report)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function DELETE(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();
    const { id } = await req.json();

    if (!mongoose.Types.ObjectId.isValid(id))
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const report = await Report.findOneAndDelete({ _id: id, doctor: user._id });
    if (!report)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
