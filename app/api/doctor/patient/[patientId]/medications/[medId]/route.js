import { NextResponse } from "next/server";
import connectToDB from "../../../../../../../lib/db.js";
import Medication from "../../../../../../../models/Medication.js";
import { authenticate } from "../../../../../../../middlewares/auth.js";
import mongoose from "mongoose";
import { randomUUID } from "crypto";

const parseDateSafe = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

// ✅ GET single medication
export async function GET(req, { params }) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    const { patientId, medId } = params;
    if (!mongoose.Types.ObjectId.isValid(medId))
      return NextResponse.json(
        { error: "Invalid medication ID" },
        { status: 400 }
      );

    const med = await Medication.findById(medId);
    if (!med)
      return NextResponse.json(
        { error: "Medication not found" },
        { status: 404 }
      );

    if (user.role !== "doctor" && med.userId.toString() !== user._id.toString())
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    if (med.userId.toString() !== patientId)
      return NextResponse.json(
        { error: "Medication does not belong to this patient" },
        { status: 403 }
      );

    const medObj = med.toObject();
    const safeDoses = Array.isArray(medObj.doses) ? medObj.doses : [];

    return NextResponse.json({
      success: true,
      medication: {
        _id: medObj._id,
        name: medObj.name,
        dosage: medObj.dosage,
        unit: medObj.unit,
        type: medObj.type,
        frequency:
          medObj.schedule === "custom"
            ? `Every ${medObj.customInterval} hours`
            : medObj.schedule,
        // ✅ Always convert to ISO strings
        startDate: medObj.startDate
          ? new Date(medObj.startDate).toISOString()
          : null,
        endDate: medObj.endDate ? new Date(medObj.endDate).toISOString() : null,
        reminders: !!medObj.reminders,
        notes: medObj.notes || "",
        times: medObj.times || [],
        filteredDoses: safeDoses.map((d) => ({
          doseId: d.doseId || randomUUID(),
          time: d.time || null,
          taken: d.taken ?? null,
          date: d.date ? new Date(d.date).toISOString() : null,
        })),
      },
    });
  } catch (err) {
    console.error("❌ GET medication error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ PUT update medication
export async function PUT(req, { params }) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    if (user.role !== "doctor")
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { patientId, medId } = params;
    if (!mongoose.Types.ObjectId.isValid(medId))
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const med = await Medication.findById(medId);
    if (!med)
      return NextResponse.json(
        { error: "Medication not found" },
        { status: 404 }
      );

    if (med.userId.toString() !== patientId)
      return NextResponse.json(
        { error: "Medication does not belong to this patient" },
        { status: 403 }
      );

    const data = await req.json();

    const fields = [
      "name",
      "dosage",
      "unit",
      "type",
      "schedule",
      "customInterval",
      "reminders",
      "notes",
      "startDate",
      "endDate",
    ];

    fields.forEach((f) => {
      if (data[f] !== undefined) {
        if (f.includes("Date")) med[f] = parseDateSafe(data[f]);
        else med[f] = data[f];
      }
    });

    if (Array.isArray(data.times)) {
      const uniqueTimes = [...new Set(data.times)];
      const existingDoses = Array.isArray(med.doses) ? med.doses : [];
      med.times = uniqueTimes;

      med.doses = uniqueTimes.map((t) => {
        const found = existingDoses.find((d) => d.time === t);
        if (found)
          return {
            ...(found.toObject?.() || found),
            date: found.date || med.startDate || new Date(),
            taken: found.taken ?? null,
          };
        return {
          doseId: randomUUID(),
          time: t,
          taken: null,
          date: med.startDate || new Date(),
        };
      });
    }

    await med.save({ validateBeforeSave: false });

    const medObj = med.toObject();
    const safeDoses = Array.isArray(medObj.doses) ? medObj.doses : [];

    return NextResponse.json({
      success: true,
      medication: {
        _id: medObj._id,
        name: medObj.name,
        dosage: medObj.dosage,
        unit: medObj.unit,
        type: medObj.type,
        frequency:
          medObj.schedule === "custom"
            ? `Every ${medObj.customInterval} hours`
            : medObj.schedule,
        startDate: medObj.startDate
          ? new Date(medObj.startDate).toISOString()
          : null,
        endDate: medObj.endDate ? new Date(medObj.endDate).toISOString() : null,
        reminders: !!medObj.reminders,
        notes: medObj.notes || "",
        times: medObj.times || [],
        filteredDoses: safeDoses.map((d) => ({
          doseId: d.doseId || randomUUID(),
          time: d.time || null,
          taken: d.taken ?? null,
          date: d.date ? new Date(d.date).toISOString() : null,
        })),
      },
    });
  } catch (err) {
    console.error("❌ PUT medication error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// ✅ DELETE medication
export async function DELETE(req, { params }) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    if (user.role !== "doctor")
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { patientId, medId } = params;
    if (!mongoose.Types.ObjectId.isValid(medId))
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const med = await Medication.findById(medId);
    if (!med)
      return NextResponse.json(
        { error: "Medication not found" },
        { status: 404 }
      );

    if (med.userId.toString() !== patientId)
      return NextResponse.json(
        { error: "Medication does not belong to this patient" },
        { status: 403 }
      );

    await med.deleteOne();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE medication error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
