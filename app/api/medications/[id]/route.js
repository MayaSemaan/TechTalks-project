import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/db.js";
import Medication from "../../../../models/Medication.js";
import { authenticate } from "../../../../middlewares/auth.js";

export async function PUT(req, { params }) {
  try {
    const user = await authenticate(req);
    await dbConnect();

    const data = await req.json();
    const med = await Medication.findOneAndUpdate(
      { _id: params.id, userId: user._id },
      data,
      { new: true }
    );

    if (!med) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(med);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await authenticate(req);
    await dbConnect();

    const med = await Medication.findOneAndDelete({
      _id: params.id,
      userId: user._id,
    });
    if (!med) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
