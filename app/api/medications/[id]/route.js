import { NextResponse } from "next/server";
import connectToDB from "../../../../lib/db.js";
import Medication from "../../../../models/Medication.js";
import { authenticate } from "../../../../middlewares/auth.js";
import mongoose from "mongoose";
import { randomUUID } from "crypto";

// -------------------
// PUT /api/medications/:id
// -------------------
export async function PUT(req, { params }) {
  try {
    console.log("✅ HIT PUT /api/medications/:id");

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

    // Authorization (Owner or Doctor)
    const isOwner = med.userId.toString() === user._id.toString();
    const isDoctor = user.role === "doctor";
    if (!isOwner && !isDoctor)
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const data = await req.json();

    // -----------------------
    // Safe Date Updates
    // -----------------------
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (data.startDate) {
      const newStart = new Date(data.startDate);
      if (!isNaN(newStart)) med.startDate = newStart;
    }

    if (data.endDate) {
      const newEnd = new Date(data.endDate);
      if (!isNaN(newEnd)) med.endDate = newEnd;
    }

    if (med.startDate && med.endDate && med.endDate < med.startDate) {
      console.warn("⚠️ endDate < startDate detected — auto-fixing");
      med.endDate = med.startDate;
    }

    if (!med.startDate) med.startDate = today;

    // -----------------------
    // Sync times and generate missing doses (preserve past taken/missed)
    // -----------------------
    if (Array.isArray(data.times)) {
      const uniqueTimes = [...new Set(data.times)];
      const existingDoses = med.doses || [];
      med.times = uniqueTimes;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      med.doses = uniqueTimes.map((t) => {
        const found = existingDoses.find((d) => d.time === t);

        if (found) {
          return {
            ...(found.toObject?.() || found),
            date: found.date || med.startDate,
            taken: found.taken !== undefined ? found.taken : null,
          };
        }

        return {
          doseId: randomUUID(),
          time: t,
          taken: null,
          date: med.startDate,
        };
      });
    }

    // -----------------------
    // Update other editable fields
    // -----------------------
    const fields = [
      "name",
      "dosage",
      "unit",
      "type",
      "schedule",
      "customInterval",
      "reminders",
      "notes",
    ];

    fields.forEach((f) => {
      if (data[f] !== undefined) med[f] = data[f];
    });

    // -----------------------
    // Update dose status if provided
    // -----------------------
    if (data.time && data.status) {
      const dose = med.doses?.find((d) => d.time === data.time);
      if (dose) {
        dose.taken =
          data.status === "taken"
            ? true
            : data.status === "missed"
            ? false
            : null;
      }
    }

    // -----------------------
    // Recalculate medication status
    // -----------------------
    const allTaken =
      med.doses?.length > 0 && med.doses.every((d) => d.taken === true);
    const allMissed =
      med.doses?.length > 0 && med.doses.every((d) => d.taken === false);
    med.status = allTaken ? "taken" : allMissed ? "missed" : "pending";

    await med.save({ validateBeforeSave: false });

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
    console.error("❌ PUT medication error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// -------------------
// DELETE /api/medications/:id
// -------------------
export async function DELETE(req, { params }) {
  try {
    console.log("✅ HIT DELETE /api/medications/:id");

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

    if (med.userId.toString() !== user._id.toString())
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await med.deleteOne();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE medication error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
// -------------------
// GET /api/medications/:id
// -------------------
export async function GET(req, { params }) {
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

    // Authorization (owner, family, or doctor)
    const isOwner = med.userId.toString() === user._id.toString();
    const isDoctor = user.role === "doctor";
    const isFamily = user.role === "family";
    if (!isOwner && !isDoctor && !isFamily)
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    return NextResponse.json({
      success: true,
      medication: {
        ...med.toObject(),
        startDate: med.startDate?.toISOString() || null,
        endDate: med.endDate?.toISOString() || null,
      },
    });
  } catch (err) {
    console.error("❌ GET /medications/:id error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
