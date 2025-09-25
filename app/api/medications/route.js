import { NextResponse } from "next/server";
import connectToDB from "../../../lib/db.js";
import Medication from "../../../models/Medication.js";
import { authenticate } from "../../../middlewares/auth.js";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();
    const meds = await Medication.find({ userId: user._id });
    return NextResponse.json(meds);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();
    const data = await req.json();
    const med = await Medication.create({ ...data, userId: user._id });
    return NextResponse.json(med, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function PUT(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();
    const data = await req.json();
    const { id, ...updates } = data;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const med = await Medication.findOneAndUpdate(
      { _id: id, userId: user._id },
      updates,
      { new: true }
    );

    if (!med) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(med);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function DELETE(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();
    const data = await req.json();
    const { id } = data;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const med = await Medication.findOneAndDelete({
      _id: id,
      userId: user._id,
    });
    if (!med) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
