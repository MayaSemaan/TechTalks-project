import { NextResponse } from "next/server";
import connectToDB from "../../../../../../../lib/db.js";
import Medication from "../../../../../../../models/Medication.js";
import { authenticate } from "../../../../../../../middlewares/auth.js";
import mongoose from "mongoose";
import crypto from "crypto";
import {
  parseDateSafe,
  normalizeTime,
  formatFrequency,
  shouldGenerateDose,
} from "../../../../../../../lib/medicationHelpers.js";

// ---------- GET single medication ----------
export async function GET(req, { params }) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    const { patientId, medId } = params;
    if (!mongoose.Types.ObjectId.isValid(medId))
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const med = await Medication.findById(medId);
    if (!med)
      return NextResponse.json(
        { error: "Medication not found" },
        { status: 404 }
      );

    // Authorization
    if (user.role !== "doctor" && med.userId.toString() !== user._id.toString())
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    if (med.userId.toString() !== patientId)
      return NextResponse.json(
        { error: "Medication not for this patient" },
        { status: 403 }
      );

    const medObj = med.toObject();
    const todayISO = new Date().toISOString().split("T")[0];

    const uniqueTimes = Array.from(
      new Set((medObj.times || []).map(normalizeTime))
    );

    const existingDoses = (medObj.doses || []).map((d) => ({
      doseId: d.doseId || crypto.randomUUID(),
      time: normalizeTime(d.time),
      taken: d.taken ?? null,
      date: d.date ? new Date(d.date).toISOString().split("T")[0] : todayISO,
    }));

    const virtualDoses = shouldGenerateDose(medObj, new Date())
      ? uniqueTimes
          .filter(
            (t) =>
              !existingDoses.some((d) => d.date === todayISO && d.time === t)
          )
          .map((t) => ({
            doseId: `${todayISO}-${t}-${medObj._id}`,
            date: todayISO,
            time: t,
            taken: null,
          }))
      : [];

    const doseMap = new Map();
    [...existingDoses, ...virtualDoses].forEach((d) => {
      const key = `${d.date}-${d.time}`;
      if (
        !doseMap.has(key) ||
        (doseMap.get(key).taken === null && d.taken !== null)
      ) {
        doseMap.set(key, d);
      }
    });

    const finalDoses = Array.from(doseMap.values()).sort((a, b) =>
      a.time.localeCompare(b.time)
    );

    // ----- Normalize customInterval -----
    const ci = medObj.customInterval || {};
    const customInterval =
      medObj.schedule === "custom"
        ? {
            number: Number(ci.number ?? 1),
            unit: ["day", "week", "month"].includes(ci.unit) ? ci.unit : "day",
          }
        : null;

    return NextResponse.json({
      medication: {
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
        startDate: medObj.startDate
          ? new Date(medObj.startDate).toISOString()
          : null,
        endDate: medObj.endDate ? new Date(medObj.endDate).toISOString() : null,
        reminders: !!medObj.reminders,
        notes: medObj.notes || "",
        times: uniqueTimes,
        filteredDoses: finalDoses,
      },
    });
  } catch (err) {
    console.error("❌ GET medication error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ---------- PUT update medication ----------
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
        { error: "Medication not for this patient" },
        { status: 403 }
      );

    const data = await req.json();

    // Normalize customInterval
    if (data.schedule === "custom") {
      const ci =
        typeof data.customInterval === "string"
          ? JSON.parse(data.customInterval)
          : data.customInterval;
      med.customInterval = {
        number: Number(ci?.number ?? 1),
        unit: ["day", "week", "month"].includes(ci?.unit) ? ci.unit : "day",
      };
    } else med.customInterval = null;

    [
      "name",
      "dosage",
      "unit",
      "type",
      "schedule",
      "reminders",
      "notes",
      "startDate",
      "endDate",
      "times",
    ].forEach((f) => {
      if (data[f] !== undefined) {
        med[f] =
          f === "startDate" || f === "endDate"
            ? parseDateSafe(data[f]) || null
            : data[f];
      }
    });

    // Deduplicate doses
    if (Array.isArray(med.doses)) {
      const map = new Map();
      med.doses.forEach((d) => {
        const date =
          d.date instanceof Date ? d.date.toISOString().split("T")[0] : d.date;
        const time = normalizeTime(d.time);
        const key = `${date}-${time}`;
        if (
          !map.has(key) ||
          (map.get(key).taken === null && d.taken !== null)
        ) {
          map.set(key, { ...d, date, time });
        }
      });
      med.doses = Array.from(map.values());
    }

    await med.save({ validateBeforeSave: false });
    return NextResponse.json({ medication: med });
  } catch (err) {
    console.error("❌ PUT medication error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
