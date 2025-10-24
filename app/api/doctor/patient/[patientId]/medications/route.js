// app/api/doctor/patient/[patientId]/medications/route.js

import { NextResponse } from "next/server";
import connectToDB from "../../../../../../lib/db.js";
import Medication from "../../../../../../models/Medication.js";
import User from "../../../../../../models/User.js";
import { authenticate } from "../../../../../../middlewares/auth.js";
import crypto from "crypto";
import mongoose from "mongoose";

// ---------- Helpers ----------
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

// ---------- Universal frequency formatter ----------
const formatFrequency = ({ schedule, customInterval }) => {
  schedule = schedule || "daily";
  let ci = customInterval;

  if (typeof ci === "string") {
    try {
      ci = JSON.parse(ci);
    } catch {
      ci = null;
    }
  }

  if (schedule === "custom") {
    if (!ci || !ci.number || !ci.unit) ci = { number: 1, unit: "day" };
    return `Every ${Number(ci.number)} ${ci.unit}${
      Number(ci.number) > 1 ? "s" : ""
    }`;
  }

  return schedule.charAt(0).toUpperCase() + schedule.slice(1);
};

// ---------- Validation ----------
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

// ---------- Scheduling helper: shouldGenerateDose ----------
const shouldGenerateDose = (med, day) => {
  if (!med.startDate) return false;
  const start = new Date(med.startDate);
  const d = new Date(day);

  // Normalize times
  start.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  if (d < start) return false;

  const schedule = med.schedule || "daily";

  switch (schedule) {
    case "daily":
      return true;
    case "weekly":
      // check day-of-week relative to start
      return d.getDay() === start.getDay();
    case "monthly":
      return d.getDate() === start.getDate();
    case "custom": {
      const ci = med.customInterval || {};
      const intervalNum = Number(ci.number) || 1;
      const intervalUnit = ci.unit || "day";
      if (intervalUnit === "day") {
        const diff = Math.floor((d - start) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff % intervalNum === 0;
      } else if (intervalUnit === "week") {
        const diff = Math.floor((d - start) / (1000 * 60 * 60 * 24 * 7));
        return diff >= 0 && diff % intervalNum === 0;
      } else if (intervalUnit === "month") {
        const months =
          (d.getFullYear() - start.getFullYear()) * 12 +
          (d.getMonth() - start.getMonth());
        return (
          months >= 0 &&
          months % intervalNum === 0 &&
          d.getDate() === start.getDate()
        );
      }
      return false;
    }
    default:
      return false;
  }
};

// ---------- Generate scheduled doses for a given day ----------
const generateDosesForDay = (med, day) => {
  // day is a Date (only day precision used)
  const selected = new Date(day);
  selected.setHours(0, 0, 0, 0);

  const start = med.startDate ? new Date(med.startDate) : null;
  const end = med.endDate ? new Date(med.endDate) : null;

  if (start) {
    const st = new Date(start);
    st.setHours(0, 0, 0, 0);
    if (selected < st) return [];
  }
  if (end) {
    const en = new Date(end);
    en.setHours(0, 0, 0, 0);
    if (selected > en) return [];
  }

  if (!shouldGenerateDose(med, selected)) return [];

  // create dose objects (one per time)
  return (Array.isArray(med.times) ? med.times : []).map((time, idx) => {
    // doseId format: ISO-idx (matches frontend expectations)
    const iso = selected.toISOString();
    return {
      doseId: `${iso}-${idx}`,
      date: iso,
      time,
      taken: null,
    };
  });
};

// ---------- GET all medications (with generated doses for selected day) ----------
// ---------- GET all medications (filtered to selected day) ----------
export async function GET(req, { params }) {
  try {
    const user = await authenticate(req);
    await connectToDB();
    const { patientId } = params;

    if (!["doctor", "family"].includes(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    // ?day=YYYY-MM-DD (optional)
    const url = new URL(req.url);
    const dayParam = url.searchParams.get("day");
    let selectedDay = dayParam ? parseDateSafe(dayParam) : new Date();
    if (!selectedDay) selectedDay = new Date();
    selectedDay.setHours(0, 0, 0, 0);

    const meds = await Medication.find({ userId: patientId }).sort({
      createdAt: -1,
    });

    const formatted = meds.map((m) => {
      const medObj = m.toObject({ flattenMaps: true });
      const safeDoses = Array.isArray(medObj.doses) ? medObj.doses : [];

      // Normalize existing doses
      const existing = safeDoses.map((d) => ({
        doseId: d.doseId || crypto.randomUUID(),
        time: d.time || null,
        taken: d.taken ?? null,
        date: d.date ? new Date(d.date).toISOString() : null,
      }));

      // Generate doses for the selected day if valid
      const generated = generateDosesForDay(medObj, selectedDay);

      // Merge with any existing doses that are specifically for the selected day
      const mergedForSelectedDay = [];

      const selectedStart = new Date(selectedDay);
      selectedStart.setHours(0, 0, 0, 0);

      existing.forEach((d) => {
        if (!d.date) return;
        const doseDate = new Date(d.date);
        doseDate.setHours(0, 0, 0, 0);
        if (doseDate.getTime() === selectedStart.getTime()) {
          mergedForSelectedDay.push(d);
        }
      });

      generated.forEach((g) => {
        const exists = mergedForSelectedDay.some(
          (x) =>
            x.time === g.time &&
            new Date(x.date).toISOString() === new Date(g.date).toISOString()
        );
        if (!exists) mergedForSelectedDay.push(g);
      });

      // Sort doses for display
      mergedForSelectedDay.sort((a, b) =>
        (a.time || "00:00").localeCompare(b.time || "00:00")
      );

      const customInterval =
        medObj.schedule === "custom" &&
        medObj.customInterval &&
        typeof medObj.customInterval === "object"
          ? {
              number: Number(medObj.customInterval.number) || 1,
              unit: medObj.customInterval.unit || "day",
            }
          : medObj.schedule === "custom"
          ? { number: 1, unit: "day" }
          : null;

      return {
        _id: medObj._id,
        name: medObj.name,
        dosage: medObj.dosage,
        unit: medObj.unit,
        type: medObj.type,
        schedule: medObj.schedule || "daily",
        customInterval,
        frequency: formatFrequency({
          schedule: medObj.schedule,
          customInterval,
        }),
        startDate: toISOStringSafe(medObj.startDate),
        endDate: toISOStringSafe(medObj.endDate),
        reminders: !!medObj.reminders,
        notes: medObj.notes || "",
        times: medObj.times || [],
        filteredDoses: mergedForSelectedDay,
      };
    });

    return NextResponse.json(formatted);
  } catch (err) {
    console.error("❌ GET medications error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ---------- POST new medication ----------
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

    const startDate = parseDateSafe(data.startDate) || new Date();
    const doses = (Array.isArray(data.times) ? data.times : []).map((time) => ({
      doseId: crypto.randomUUID(),
      time,
      taken: null,
      date: startDate,
    }));

    const customInterval =
      data.schedule === "custom" &&
      data.customInterval &&
      typeof data.customInterval === "object"
        ? {
            number: Number(data.customInterval.number) || 1,
            unit: data.customInterval.unit || "day",
          }
        : data.schedule === "custom"
        ? { number: 1, unit: "day" }
        : null;

    const medData = {
      name: data.name.trim(),
      dosage: Number(data.dosage),
      unit: data.unit || "mg",
      type: data.type || "tablet",
      schedule: data.schedule || "daily",
      customInterval,
      times: data.times,
      startDate,
      endDate: parseDateSafe(data.endDate),
      reminders: !!data.reminders,
      notes: data.notes || "",
      userId: patientId,
      doses,
    };

    const med = await Medication.create(medData);
    const safeDoses = Array.isArray(med.doses) ? med.doses : [];

    const responseMed = {
      _id: med._id,
      name: med.name,
      dosage: med.dosage,
      unit: med.unit,
      type: med.type,
      schedule: med.schedule,
      customInterval,
      frequency: formatFrequency({ schedule: med.schedule, customInterval }),
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
    };

    return NextResponse.json({ medication: responseMed }, { status: 201 });
  } catch (err) {
    console.error("❌ POST medications error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
