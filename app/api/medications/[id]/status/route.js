import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "../../../../../lib/db.js";
import Medication from "../../../../../models/Medication.js";
import { authenticate } from "../../../../../middlewares/auth.js";

// ✅ PATCH /api/medications/[id]/status
export async function PATCH(req, context) {
  try {
    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    let medId;
    try {
      medId = new mongoose.Types.ObjectId(id);
    } catch {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const user = await authenticate(req);
    await dbConnect();

    const { date, taken } = await req.json();
    if (!date)
      return NextResponse.json({ error: "Date required" }, { status: 400 });

    const med = await Medication.findOneAndUpdate(
      { _id: medId, userId: user._id },
      {
        $set: {
          "doses.$[elem].taken": taken,
          status: taken ? "taken" : "missed",
        },
      },
      {
        arrayFilters: [{ "elem.date": new Date(date) }],
        new: true,
      }
    );

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
