"use server";

import { NextResponse } from "next/server";
import connectToDB from "../../../../../../../lib/db.js";
import Medication from "../../../../../../../models/Medication.js";
import User from "../../../../../../../models/User.js";
import { authenticate } from "../../../../../../../middlewares/auth.js";
import crypto from "crypto";

// ---------- Helpers ----------
const parseDateSafe = (val) => (val ? new Date(val) : null);
const toISOStringSafe = (val) => (val ? new Date(val).toISOString() : null);

// ---------- Normalize custom interval ----------
// ---------- Normalize custom interval ----------
const normalizeCustomInterval = (med) => {
  if (med.schedule !== "custom") return null;

  let number = 1;
  let unit = "day";

  if (med.customInterval) {
    // if it's an object with number/unit
    if (
      typeof med.customInterval.number === "number" &&
      med.customInterval.unit
    ) {
      number = Number(med.customInterval.number) || 1;
      unit = ["day", "week", "month"].includes(med.customInterval.unit)
        ? med.customInterval.unit
        : "day";
    }

    // if frontend sends a string like "every 3 days"
    if (typeof med.customInterval === "string") {
      const match = med.customInterval.match(/every (\d+) (day|week|month)s?/i);
      if (match) {
        number = Number(match[1]);
        unit = match[2].toLowerCase();
      }
    }
  }

  return { number, unit };
};

// ---------- Dose generation logic ----------
const shouldGenerateDose = (med, day) => {
  if (!med.startDate) return false;

  const start = new Date(med.startDate);
  start.setHours(0, 0, 0, 0);
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);

  if (d < start) return false;

  switch (med.schedule) {
    case "daily":
      return true;
    case "weekly":
      return d.getDay() === start.getDay();
    case "monthly":
      return d.getDate() === start.getDate();
    case "custom": {
      if (!med.customInterval) return false;
      const { number, unit } = med.customInterval;

      let diff = 0;
      if (unit === "day") {
        diff = Math.floor((d - start) / (1000 * 60 * 60 * 24));
      } else if (unit === "week") {
        diff = Math.floor((d - start) / (1000 * 60 * 60 * 24 * 7));
      } else if (unit === "month") {
        diff =
          (d.getFullYear() - start.getFullYear()) * 12 +
          (d.getMonth() - start.getMonth());
      }

      return diff >= 0 && diff % number === 0;
    }
    default:
      return false;
  }
};

// ---------- GET ----------
// ---------- GET ----------
export async function GET(req, { params }) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    const { patientId } = params;
    if (!["doctor", "family"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const url = new URL(req.url);
    const dayParam = url.searchParams.get("day");
    const selectedDay = dayParam ? parseDateSafe(dayParam) : new Date();
    selectedDay.setHours(0, 0, 0, 0);
    const dayISO = selectedDay.toISOString().split("T")[0];

    // ✅ Explicitly select customInterval to make sure it's included
    const meds = await Medication.find({ userId: patientId })
      .select(
        "name dosage unit type schedule customInterval startDate endDate times doses notes reminders createdAt"
      )
      .sort({ createdAt: -1 });

    const formatted = meds.map((med) => {
      const medObj = med.toObject({ flattenMaps: true });

      medObj.startDate = new Date(medObj.startDate);
      const customInterval = normalizeCustomInterval(medObj);

      console.log(
        "DEBUG GET route customInterval:",
        med.name,
        medObj.customInterval
      );

      const uniqueTimes = Array.from(
        new Set((medObj.times || []).map((t) => t.trim()))
      );

      // Map existing doses by date+time
      const doseMap = new Map();
      (medObj.doses || []).forEach((d) => {
        if (!d.date || !d.time) return;
        const key = `${toISOStringSafe(d.date).split("T")[0]}-${d.time}`;
        doseMap.set(key, { ...d, doseId: d.doseId || crypto.randomUUID() });
      });

      // Generate virtual doses for selected day
      const virtualDoses = shouldGenerateDose(
        { ...medObj, customInterval },
        selectedDay
      )
        ? uniqueTimes
            .filter((time) => !doseMap.has(`${dayISO}-${time}`))
            .map((time) => ({
              doseId: `${dayISO}-${time}-${medObj._id}`,
              date: dayISO,
              time,
              taken: null,
            }))
        : [];

      const allDoses = [...doseMap.values(), ...virtualDoses].sort((a, b) =>
        (a.time || "").localeCompare(b.time || "")
      );

      return {
        ...medObj,
        customInterval,
        filteredDoses: allDoses,
      };
    });

    return NextResponse.json({ success: true, medications: formatted });
  } catch (err) {
    console.error("❌ GET medications error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ---------- POST ----------
export async function POST(req, { params }) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    if (user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { patientId } = params;
    const patient = await User.findById(patientId);
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const data = await req.json();
    const startDate = parseDateSafe(data.startDate) || new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = data.endDate ? parseDateSafe(data.endDate) : startDate;
    endDate.setHours(0, 0, 0, 0);

    const schedule = data.schedule || "daily";
    const customInterval = normalizeCustomInterval({
      schedule,
      customInterval: data.customInterval,
    });

    const uniqueTimes = Array.from(
      new Set((data.times || []).map((t) => t.trim()))
    );

    // Generate doses
    const doses = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      if (
        shouldGenerateDose({ startDate, schedule, customInterval }, current)
      ) {
        uniqueTimes.forEach((time) => {
          doses.push({
            doseId: crypto.randomUUID(),
            date: current.toISOString().split("T")[0],
            time,
            taken: null,
          });
        });
      }
      current.setDate(current.getDate() + 1);
    }

    const medData = {
      name: (data.name || "").trim(),
      dosage: Number(data.dosage),
      unit: data.unit || "mg",
      type: data.type || "tablet",
      schedule,
      customInterval,
      times: uniqueTimes,
      startDate,
      endDate,
      reminders: !!data.reminders,
      notes: data.notes || "",
      userId: patientId,
      doses,
    };

    const med = await Medication.create(medData);

    return NextResponse.json(
      { success: true, medication: med },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ POST medications error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
