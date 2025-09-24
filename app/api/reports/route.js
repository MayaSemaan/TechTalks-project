import dbConnect from "../../../lib/dbConnect.js";
import Report from "../../../models/Report.js";
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

// Helper function to move uploaded file
const saveFile = (file) => {
  const uploadDir = path.join(process.cwd(), "public/uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const fileName = `${Date.now()}_${file.originalFilename}`;
  const filePath = path.join(uploadDir, fileName);
  fs.renameSync(file.filepath, filePath);

  return `/uploads/${fileName}`;
};

/*export async function GET(req) {
  await dbConnect();
  try {
    // Optional: filter by doctorId if query exists
    const url = new URL(req.url);
    const doctorId = url.searchParams.get("doctorId");

    let query = {};
    if (doctorId) query.doctor = doctorId;

    const reports = await Report.find(query).populate("doctor patient").lean();
    return new Response(JSON.stringify({ success: true, reports }), {
      status: 200,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
}

export async function POST(req) {
  await dbConnect();
  try {
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
      return new Response(
        JSON.stringify({ success: false, error: "All fields are required" }),
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

    const populatedReport = await report.populate("doctor patient");

    return new Response(
      JSON.stringify({ success: true, report: populatedReport }),
      {
        status: 201,
      }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
} */
