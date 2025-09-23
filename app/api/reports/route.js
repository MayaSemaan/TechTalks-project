// app/api/reports/route.js
import dbConnect from "../../../lib/dbConnect.js";
import Report from "../../../models/Report.js";
import User from "../../../models/User.js";
import mongoose from "mongoose";

export async function POST(req) {
  await dbConnect();

  try {
    const body = await req.json();
    const doctorId = new mongoose.Types.ObjectId(body.doctor);
    const patientId = new mongoose.Types.ObjectId(body.patient);

    const report = await Report.create({
      doctor: doctorId,
      patient: patientId,
      title: body.title,
      description: body.description,
      fileUrl: body.fileUrl,
    });

    // Populate doctor & patient info
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
      {
        status: 500,
      }
    );
  }
}
