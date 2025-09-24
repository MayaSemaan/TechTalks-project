import { NextResponse } from "next/server";
import dbConnect from "../../../../../lib/db.js";
import Report from "../../../../../models/Report.js";

export async function GET(req) {
  try {
    await dbConnect();
    const url = new URL(req.url);
    const doctorId = url.searchParams.get("doctorId");
    if (!doctorId)
      return NextResponse.json({ error: "Missing doctorId" }, { status: 400 });

    const reports = await Report.find({ doctor: doctorId });
    return NextResponse.json(reports);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
