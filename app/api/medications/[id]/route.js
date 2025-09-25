import { NextResponse } from "next/server";
import connectToDB from "../../../../lib/db.js";
import Medication from "../../../../models/Medication.js";
import { authenticate } from "../../../middlewares/auth.js";

export async function PUT(req, { params }) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    const { id } = params;
    const data = await req.json();

    const updated = await Medication.findOneAndUpdate(
      { _id: id, userId: user._id },
      data,
      { new: true }
    );

    if (!updated) throw new Error("Medication not found or unauthorized");
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    const { id } = params;
    const deleted = await Medication.findOneAndDelete({
      _id: id,
      userId: user._id,
    });

    if (!deleted) throw new Error("Medication not found or unauthorized");
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
