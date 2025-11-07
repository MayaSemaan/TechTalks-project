import { NextResponse } from "next/server";
import connectToDB from "../../../lib/db.js";
import Medication from "../../../models/Medication.js";
import User from "../../../models/User.js";
import { authenticate } from "../../../middlewares/auth.js";
import crypto from "crypto";

// --- Safe date parser ---
const parseDateSafe = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

// --- Validate medication input ---
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

// --- GET all medications ---
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

    const todayStr = new Date().toDateString();
    const result = meds.map((m) => {
      const dosesToday = (m.doses || [])
        .filter((d) => new Date(d.date).toDateString() === todayStr)
        .map((d) => ({
          doseId: d.doseId,
          time: d.time,
          taken:
            d.taken === true
              ? "taken"
              : d.taken === false
              ? "missed"
              : "pending",
          date: d.date,
        }));

      return {
        ...m.toObject(),
        startDate: m.startDate?.toISOString() || null,
        endDate: m.endDate?.toISOString() || null,
        reminders: !!m.reminders,
        doses: dosesToday,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// --- POST: add new medication ---
export async function POST(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();
    const data = await req.json();
    validateMedicationData(data);

    if (user.role === "family") {
      const linkedIds = user.linkedFamily.map((id) => id.toString());
      if (!data.userId || !linkedIds.includes(data.userId)) {
        return NextResponse.json(
          { error: "Unauthorized or invalid userId" },
          { status: 403 }
        );
      }
    }

    const userExists = await User.findById(data.userId || user._id);
    if (!userExists)
      return NextResponse.json({ error: "User not found" }, { status: 400 });

    const customInterval =
      data.schedule === "custom"
        ? data.customInterval || { number: 1, unit: "day" }
        : undefined;

    // --- Generate initial doses for startDate only ---
    const startDate = parseDateSafe(data.startDate) || new Date();
    const doses = data.times.map((time) => ({
      doseId: crypto.randomUUID(),
      time,
      taken: null,
      date: startDate,
    }));

    const medData = {
      name: data.name.trim(),
      dosage: Number(data.dosage),
      unit: data.unit || "mg",
      type: data.type || "tablet",
      schedule: data.schedule,
      customInterval,
      times: data.times,
      startDate,
      endDate: parseDateSafe(data.endDate),
      reminders: !!data.reminders,
      notes: data.notes || "",
      userId: data.userId || user._id,
      doses,
    };

    const med = await Medication.create(medData);

    return NextResponse.json(
      {
        success: true,
        medication: {
          ...med.toObject(),
          startDate: med.startDate?.toISOString() || null,
          endDate: med.endDate?.toISOString() || null,
          reminders: !!med.reminders,
          doses: doses.map((d) => ({ ...d, taken: "pending" })),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
