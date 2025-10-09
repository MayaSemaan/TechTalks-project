import { NextResponse } from "next/server";
import connectToDB from "../../../../lib/db.js";
import Medication from "../../../../models/Medication.js";
import User from "../../../../models/User.js";
import { authenticate } from "../../../../middlewares/auth.js";
import mongoose from "mongoose";

const parseDateSafe = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

// PUT /api/medications/:id
export async function PUT(req, { params }) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const med = await Medication.findById(id);
    if (!med)
      return NextResponse.json(
        { error: "Medication not found" },
        { status: 404 }
      );

    if (user.role === "family") {
      const linkedIds = user.linkedFamily.map((i) => i.toString());
      if (!linkedIds.includes(med.userId.toString()))
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    } else if (med.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await req.json();

    // ✅ Merge existing doses to preserve status
    if (data.times) {
      const existingDoses = med.doses || [];
      const newDoses = data.times.map((t) => {
        const found = existingDoses.find((d) => d.time === t);
        return (
          found || { time: t, taken: null, date: med.startDate || new Date() }
        );
      });
      med.doses = newDoses;
    }

    const fields = [
      "name",
      "dosage",
      "unit",
      "type",
      "schedule",
      "customInterval",
      "startDate",
      "endDate",
      "reminders",
      "notes",
    ];
    fields.forEach((f) => {
      if (data[f] !== undefined) med[f] = data[f];
    });

    // ✅ Update single dose if called
    if (data.time && data.status) {
      const dose = med.doses.find((d) => d.time === data.time);
      if (dose) {
        dose.taken =
          data.status === "taken"
            ? true
            : data.status === "missed"
            ? false
            : null;
      }
    }

    await med.save();

    return NextResponse.json(
      {
        ...med.toObject(),
        doses: med.times.map((t) => {
          const dose = med.doses.find((d) => d.time === t) || {};
          const status =
            dose.taken === true
              ? "taken"
              : dose.taken === false
              ? "missed"
              : "pending";
          return { time: t, taken: status, date: dose.date || null };
        }),
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// DELETE /api/medications/:id
export async function DELETE(req, { params }) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const med = await Medication.findById(id);
    if (!med)
      return NextResponse.json(
        { error: "Medication not found" },
        { status: 404 }
      );

    if (user.role === "family") {
      const linkedIds = user.linkedFamily.map((i) => i.toString());
      if (!linkedIds.includes(med.userId.toString()))
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    } else if (med.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await med.deleteOne();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
