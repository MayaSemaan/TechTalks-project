import { NextResponse } from "next/server";
import connectToDB from "../../../../lib/db.js";
import Medication from "../../../../models/Medication.js";
import { authenticate } from "../../../../middlewares/auth.js";
import mongoose from "mongoose";
import { randomUUID } from "crypto";

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

    // ✅ Authorization (Owner or Doctor)
    const isOwner = med.userId.toString() === user._id.toString();
    const isDoctor = user.role === "doctor";
    if (!isOwner && !isDoctor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await req.json();

    // ✅ Ensure valid startDate
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let startDate = med.startDate ? new Date(med.startDate) : today;
    startDate.setHours(0, 0, 0, 0);
    if (startDate < today) {
      med.startDate = today;
      startDate = today;
    }

    // ✅ Update doses if before startDate
    med.doses = (med.doses || []).map((d) => {
      const doseDate = new Date(d.date);
      doseDate.setHours(0, 0, 0, 0);
      if (doseDate < startDate) {
        return { ...d.toObject(), date: startDate, taken: null };
      }
      return d;
    });

    // ✅ Sync times and generate missing doses
    if (data.times) {
      const uniqueTimes = [...new Set(data.times)];
      const existingDoses = med.doses || [];
      med.times = uniqueTimes;

      med.doses = uniqueTimes.map((t) => {
        const found = existingDoses.find((d) => d.time === t);
        if (found) return found;
        return {
          doseId: randomUUID(),
          time: t,
          taken: null,
          date: startDate,
        };
      });
    }

    // ✅ Update fields
    const fields = [
      "name",
      "dosage",
      "unit",
      "type",
      "schedule",
      "customInterval",
      "endDate",
      "reminders",
      "notes",
    ];
    fields.forEach((f) => {
      if (data[f] !== undefined) med[f] = data[f];
    });

    // ✅ Update dose status if provided
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

    // ✅ Recalculate medication status
    const allTaken = med.doses.every((d) => d.taken === true);
    const allMissed = med.doses.every((d) => d.taken === false);
    med.status = allTaken ? "taken" : allMissed ? "missed" : "pending";

    await med.save();

    return NextResponse.json({
      ...med.toObject(),
      doses: med.doses.map((d) => ({
        doseId: d.doseId,
        time: d.time,
        taken:
          d.taken === true ? "taken" : d.taken === false ? "missed" : "pending",
        date: d.date || null,
      })),
      medicationStatus: med.status,
    });
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

    // ✅ Only Owner can delete
    if (med.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await med.deleteOne();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
