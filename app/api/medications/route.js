import { NextResponse } from "next/server";
import connectToDB from "../../../lib/db.js";
import Medication from "../../../models/Medication.js";
import { authenticate } from "../../../middlewares/auth.js";
import mongoose from "mongoose";

// GET all medications
export async function GET(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    let meds;
    if (user.role === "patient") {
      meds = await Medication.find({ userId: user._id }).sort({
        createdAt: -1,
      });
    } else if (user.role === "family") {
      meds = await Medication.find({ userId: { $in: user.linkedFamily } }).sort(
        { createdAt: -1 }
      );
    } else if (user.role === "doctor") {
      meds = await Medication.find({ userId: { $in: user.patient } }).sort({
        createdAt: -1,
      });
    }

    return NextResponse.json(meds);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// POST new medication (family can create for linked patients)
export async function POST(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    const data = await req.json();

    let med;
    if (user.role === "patient") {
      med = await Medication.create({ ...data, userId: user._id });
    } else if (user.role === "family") {
      if (!data.userId || !user.linkedFamily.includes(data.userId)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      med = await Medication.create(data);
    } else if (user.role === "doctor") {
      if (!data.userId || !user.patient.includes(data.userId)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      med = await Medication.create(data);
    }

    return NextResponse.json(med, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
