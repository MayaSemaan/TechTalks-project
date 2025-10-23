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

const toISOStringSafe = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

const formatFrequency = (medObj) => {
  if (!medObj) return "N/A";

  if (medObj.schedule === "custom" && medObj.customInterval) {
    const number = Number(medObj.customInterval.number);
    const unit = medObj.customInterval.unit;

    if (!number || !unit) return "N/A"; // ✅ ensure valid custom interval

    return `Every ${number} ${unit}${number > 1 ? "s" : ""}`;
  }

  return medObj.schedule
    ? medObj.schedule.charAt(0).toUpperCase() + medObj.schedule.slice(1)
    : "Daily";
};

// GET single medication
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

    const responseMed = {
      _id: medObj._id,
      name: medObj.name,
      dosage: medObj.dosage,
      unit: medObj.unit,
      type: medObj.type,
      schedule: medObj.schedule || "daily",
      customInterval: medObj.customInterval || null,
      frequency: formatFrequency(medObj), // ✅ Always correct
      startDate: toISOStringSafe(medObj.startDate),
      endDate: toISOStringSafe(medObj.endDate),
      reminders: !!medObj.reminders,
      notes: medObj.notes || "",
      times: medObj.times || [],
      filteredDoses: safeDoses.map((d) => ({
        doseId: d.doseId || randomUUID(),
        time: d.time || null,
        taken: d.taken ?? null,
        date: toISOStringSafe(d.date),
      })),
    };

    return NextResponse.json({ medication: responseMed });
  } catch (err) {
    console.error("❌ GET medication error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT update medication
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
        med[f] = f.includes("Date") ? parseDateSafe(data[f]) : data[f];
      }
    });

    await med.save({ validateBeforeSave: false });

    const medObj = med.toObject();
    const safeDoses = Array.isArray(medObj.doses) ? medObj.doses : [];

    const responseMed = {
      _id: medObj._id,
      name: medObj.name,
      dosage: medObj.dosage,
      unit: medObj.unit,
      type: medObj.type,
      schedule: medObj.schedule || "daily",
      customInterval: medObj.customInterval || null,
      frequency: formatFrequency(medObj), // ✅ Always correct after edit
      startDate: toISOStringSafe(medObj.startDate),
      endDate: toISOStringSafe(medObj.endDate),
      reminders: !!medObj.reminders,
      notes: medObj.notes || "",
      times: medObj.times || [],
      filteredDoses: safeDoses.map((d) => ({
        doseId: d.doseId || randomUUID(),
        time: d.time || null,
        taken: d.taken ?? null,
        date: d.date ? new Date(d.date).toISOString() : null,
      })),
    };

    return NextResponse.json({ medication: responseMed });
  } catch (err) {
    console.error("❌ PUT medication error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
