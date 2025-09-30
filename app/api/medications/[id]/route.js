import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/db.js";
import Medication from "../../../../models/Medication.js";
import User from "../../../../models/User.js";
import { authenticate } from "../../../../middlewares/auth.js";

export async function PUT(req, { params }) {
  try {
    const user = await authenticate(req);
    await dbConnect();

    const data = await req.json();

    let med;
    if (user.role === "family") {
      // Family can update meds of linked patients
      med = await Medication.findOneAndUpdate(
        { _id: params.id, userId: { $in: user.linkedFamily } },
        data,
        { new: true }
      );
    } else {
      med = await Medication.findOneAndUpdate(
        { _id: params.id, userId: user._id },
        data,
        { new: true }
      );
    }

    if (!med)
      return NextResponse.json(
        { error: "Not found or unauthorized" },
        { status: 404 }
      );

    return NextResponse.json(med);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await authenticate(req);
    await dbConnect();

    let med;
    if (user.role === "family") {
      med = await Medication.findOneAndDelete({
        _id: params.id,
        userId: { $in: user.linkedFamily },
      });
    } else {
      med = await Medication.findOneAndDelete({
        _id: params.id,
        userId: user._id,
      });
    }

    if (!med)
      return NextResponse.json(
        { error: "Not found or unauthorized" },
        { status: 404 }
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
