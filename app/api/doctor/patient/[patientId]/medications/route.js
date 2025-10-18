import { NextResponse } from "next/server";
import connectToDB from "../../../../../../lib/db.js";
import Medication from "../../../../../../models/Medication.js";
import User from "../../../../../../models/User.js";
import { authenticate } from "../../../../../../middlewares/auth.js";
import crypto from "crypto";

// Safely parse date inputs
const parseDateSafe = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

// ✅ Convert any value to ISO string safely
const toISOStringSafe = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

// Validate medication fields
function validateMedicationData(data) {
  if (!data.name || typeof data.name !== "string" || data.name.trim() === "")
    throw new Error("Invalid medication name");
  if (isNaN(data.dosage) || data.dosage <= 0)
    throw new Error("Invalid dosage value");
  if (!Array.isArray(data.times) || data.times.length === 0)
    throw new Error("At least one valid time is required");

  data.times.forEach((t) => {
    if (!/^([0-1]\d|2[0-3]):([0-5]\d)$/.test(t))
      throw new Error("Invalid time format in times array");
  });
}

// ✅ GET all medications for a specific patient
export async function GET(req, { params }) {
  try {
    const user = await authenticate(req);
    await connectToDB();
    const { patientId } = params;

    if (!["doctor", "family"].includes(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const meds = await Medication.find({ userId: patientId }).sort({
      createdAt: -1,
    });

    const formatted = meds.map((m) => {
      const medObj = m.toObject();
      const safeDoses = Array.isArray(medObj.doses) ? medObj.doses : [];

      return {
        _id: medObj._id,
        name: medObj.name,
        dosage: medObj.dosage,
        unit: medObj.unit,
        type: medObj.type,
        frequency:
          medObj.schedule === "custom"
            ? `Every ${medObj.customInterval || 1} hours`
            : medObj.schedule,
        startDate: toISOStringSafe(medObj.startDate),
        endDate: toISOStringSafe(medObj.endDate),
        reminders: !!medObj.reminders,
        notes: medObj.notes || "",
        times: medObj.times || [],
        filteredDoses: safeDoses.map((d) => ({
          doseId: d.doseId || crypto.randomUUID(),
          time: d.time || null,
          taken: d.taken ?? null,
          date: toISOStringSafe(d.date),
        })),
      };
    });

    return NextResponse.json(formatted);
  } catch (err) {
    console.error("❌ GET medications error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ POST new medication for a specific patient
export async function POST(req, { params }) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    if (user.role !== "doctor")
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { patientId } = params;
    const patient = await User.findById(patientId);
    if (!patient)
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const data = await req.json();
    validateMedicationData(data);

    const doses = (Array.isArray(data.times) ? data.times : []).map((time) => ({
      doseId: crypto.randomUUID(),
      time,
      taken: null,
      date: parseDateSafe(data.startDate) || new Date(),
    }));

    const medData = {
      name: data.name.trim(),
      dosage: Number(data.dosage),
      unit: data.unit || "mg",
      type: data.type || "tablet",
      schedule: data.schedule || "daily",
      customInterval:
        data.schedule === "custom" ? data.customInterval : undefined,
      times: data.times,
      startDate: parseDateSafe(data.startDate),
      endDate: parseDateSafe(data.endDate),
      reminders: !!data.reminders,
      notes: data.notes || "",
      userId: patientId,
      doses,
    };

    const med = await Medication.create(medData);
    const safeDoses = Array.isArray(med.doses) ? med.doses : [];

    return NextResponse.json(
      {
        _id: med._id,
        name: med.name,
        dosage: med.dosage,
        unit: med.unit,
        type: med.type,
        frequency:
          med.schedule === "custom"
            ? `Every ${med.customInterval || 1} hours`
            : med.schedule,
        startDate: toISOStringSafe(med.startDate),
        endDate: toISOStringSafe(med.endDate),
        reminders: !!med.reminders,
        notes: med.notes || "",
        times: med.times || [],
        filteredDoses: safeDoses.map((d) => ({
          doseId: d.doseId || crypto.randomUUID(),
          time: d.time || null,
          taken: d.taken ?? null,
          date: toISOStringSafe(d.date),
        })),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ POST medications error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
