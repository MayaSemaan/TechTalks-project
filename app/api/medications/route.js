import { NextResponse } from "next/server";
import connectToDB from "../../../lib/db.js";
import Medication from "../../../models/Medication.js";
import { authenticate } from "../../../middlewares/auth.js";
import mongoose from "mongoose";

// GET all medications for logged-in user
export async function GET(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    const meds = await Medication.find({ userId: user._id }).sort({
      createdAt: -1,
    });

    return NextResponse.json(meds);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// CREATE a new medication
export async function POST(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    const data = await req.json();
    const med = await Medication.create({ ...data, userId: user._id });

    return NextResponse.json(med, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// UPDATE an existing medication
export async function PUT(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    const { id, ...updates } = await req.json();

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid or missing ID" },
        { status: 400 }
      );
    }

    const med = await Medication.findOneAndUpdate(
      { _id: id, userId: user._id },
      updates,
      { new: true }
    );

    if (!med) {
      return NextResponse.json(
        { error: "Medication not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(med);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// DELETE a medication
export async function DELETE(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    const { id } = await req.json();

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid or missing ID" },
        { status: 400 }
      );
    }

    const med = await Medication.findOneAndDelete({
      _id: id,
      userId: user._id,
    });

    if (!med) {
      return NextResponse.json(
        { error: "Medication not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
