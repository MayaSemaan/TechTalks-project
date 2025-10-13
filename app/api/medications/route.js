import { NextResponse } from "next/server";
import connectToDB from "../../../lib/db.js";
import Medication from "../../../models/Medication.js";
import User from "../../../models/User.js";
import { authenticate } from "../../../middlewares/auth.js";
import crypto from "crypto";

// Safe date parser
const parseDateSafe = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

// Utility: validate medication fields before saving
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

// GET all medications
export async function GET(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    let meds;
    if (user.role === "family") {
      const linkedIds = user.linkedFamily.map((id) => id.toString());
      meds = await Medication.find({ userId: { $in: linkedIds } }).sort({
        createdAt: -1,
      });
    } else {
      meds = await Medication.find({ userId: user._id }).sort({
        createdAt: -1,
      });
    }

    return NextResponse.json(
      meds.map((m) => ({
        ...m.toObject(),
        startDate: m.startDate?.toISOString() || null,
        endDate: m.endDate?.toISOString() || null,
        reminders: !!m.reminders,
        doses: (m.times || []).map((t) => {
          const dose = m.doses.find((d) => d.time === t) || {};
          const status =
            dose.taken === true
              ? "taken"
              : dose.taken === false
              ? "missed"
              : "pending";
          return {
            doseId: dose.doseId,
            time: t,
            taken: status,
            date: dose.date || null,
          };
        }),
      }))
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// POST new medication
export async function POST(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    const data = await req.json();

    validateMedicationData(data);

    if (user.role === "family") {
      const linkedIds = user.linkedFamily.map((id) => id.toString());
      if (!data.userId || !linkedIds.includes(data.userId))
        return NextResponse.json(
          { error: "Unauthorized or invalid userId" },
          { status: 403 }
        );
    }

    const userExists = await User.findById(data.userId || user._id);
    if (!userExists)
      return NextResponse.json({ error: "User not found" }, { status: 400 });

    const customInterval =
      data.schedule === "custom"
        ? data.customInterval || { number: 1, unit: "day" }
        : undefined;

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
      schedule: data.schedule,
      customInterval,
      times: data.times,
      startDate: parseDateSafe(data.startDate),
      endDate: parseDateSafe(data.endDate),
      reminders: !!data.reminders,
      notes: data.notes || "",
      userId: data.userId || user._id,
      doses,
    };

    const med = await Medication.create(medData);

    return NextResponse.json(
      {
        ...med.toObject(),
        startDate: med.startDate?.toISOString() || null,
        endDate: med.endDate?.toISOString() || null,
        reminders: !!med.reminders,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
