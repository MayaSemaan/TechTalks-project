import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/db.js";
import Report from "../../../../models/Report.js";
import { verifyToken } from "../../../../lib/auth.js";

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const token = req.headers.get("Authorization")?.split(" ")[1];
    if (!token)
      return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const user = await verifyToken(token);
    const data = await req.json();
    const report = await Report.findOneAndUpdate(
      { _id: params.id, doctor: user._id },
      data,
      { new: true }
    ).populate("doctor patient", "name role");

    if (!report)
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const token = req.headers.get("Authorization")?.split(" ")[1];
    if (!token)
      return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const user = await verifyToken(token);
    const report = await Report.findOneAndDelete({
      _id: params.id,
      doctor: user._id,
    });
    if (!report)
      return NextResponse.json({ error: "Report not found" }, { status: 404 });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
