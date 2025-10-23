import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDB from "../../../../lib/db.js";
import Medication from "../../../../models/Medication.js";
import { authenticate } from "../../../../middlewares/auth.js";
import { randomUUID } from "crypto";

// --- Safe date parser ---
const parseDateSafe = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

// --- PATCH: update today's dose ---
export async function PATCH(req, { params }) {
  try {
    const user = await authenticate(req);
    await connectToDB();
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const { doseId, status } = await req.json();
    if (!doseId || !status)
      return NextResponse.json(
        { error: "doseId and status are required" },
        { status: 400 }
      );

    const med = await Medication.findById(id);
    if (!med)
      return NextResponse.json(
        { error: "Medication not found" },
        { status: 404 }
      );

    const isOwner = med.userId.toString() === user._id.toString();
    let isFamily = false;
    if (user.role === "family") {
      const patient = await mongoose.model("User").findById(med.userId);
      if (
        patient?.linkedFamily?.some(
          (fid) => fid.toString() === user._id.toString()
        )
      )
        isFamily = true;
    }
    if (!isOwner && !isFamily)
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const todayStr = new Date().toDateString();
    const dose = med.doses.find(
      (d) => d.doseId === doseId && new Date(d.date).toDateString() === todayStr
    );
    if (!dose)
      return NextResponse.json(
        { error: "Dose not found for today" },
        { status: 404 }
      );

    dose.taken = status === "taken" ? true : status === "missed" ? false : null;
    await med.save();

    return NextResponse.json({
      success: true,
      updatedDose: {
        doseId: dose.doseId,
        time: dose.time,
        taken: status,
        date: dose.date,
      },
    });
  } catch (err) {
    console.error("PATCH error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// --- PUT: update medication ---
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

    const isOwner = med.userId.toString() === user._id.toString();
    const isDoctor = user.role === "doctor";
    if (!isOwner && !isDoctor)
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const data = await req.json();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // --- Update core fields ---
    if (data.startDate) med.startDate = parseDateSafe(data.startDate);
    if (data.endDate) med.endDate = parseDateSafe(data.endDate);
    if (!med.startDate) med.startDate = today;

    [
      "name",
      "dosage",
      "unit",
      "type",
      "schedule",
      "customInterval",
      "reminders",
      "notes",
    ].forEach((f) => {
      if (data[f] !== undefined) med[f] = data[f];
    });

    // --- Filter old doses outside date range ---
    if (med.startDate || med.endDate) {
      med.doses = (med.doses || []).filter(
        (d) =>
          new Date(d.date) >= med.startDate &&
          (!med.endDate || new Date(d.date) <= med.endDate)
      );
    }

    // --- Update times and regenerate doses ---
    if (Array.isArray(data.times)) {
      const uniqueTimes = [...new Set(data.times)];
      med.times = uniqueTimes;

      const oldDoses = med.doses || [];
      const days = [];
      const start = new Date(med.startDate);
      const end =
        med.endDate ||
        new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1))
        days.push(new Date(d));

      const intervalDays =
        med.schedule === "custom"
          ? med.customInterval.unit === "day"
            ? med.customInterval.number
            : med.customInterval.unit === "week"
            ? med.customInterval.number * 7
            : med.customInterval.number * 30
          : 1;

      const newDoses = [];
      for (let i = 0; i < days.length; i += intervalDays) {
        const day = days[i];
        uniqueTimes.forEach((t) => {
          const found = oldDoses.find(
            (d) =>
              d.time === t &&
              new Date(d.date).toDateString() === day.toDateString()
          );
          newDoses.push({
            doseId: found?.doseId || randomUUID(),
            time: t,
            taken: found?.taken ?? null,
            date: day,
          });
        });
      }
      med.doses = newDoses;
    }

    await med.save();

    // --- Doses for today ---
    const todayStr = today.toDateString();
    const dosesToday = med.doses
      .filter((d) => new Date(d.date).toDateString() === todayStr)
      .map((d) => ({
        doseId: d.doseId,
        time: d.time,
        taken:
          d.taken === true ? "taken" : d.taken === false ? "missed" : "pending",
        date: d.date,
      }));

    return NextResponse.json({
      success: true,
      medication: { ...med.toObject(), doses: dosesToday },
    });
  } catch (err) {
    console.error("PUT error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// --- DELETE ---
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
    if (med.userId.toString() !== user._id.toString())
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await med.deleteOne();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// --- GET single medication ---
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

    const isOwner = med.userId.toString() === user._id.toString();
    const isDoctor = user.role === "doctor";
    const isFamily = user.role === "family";
    if (!isOwner && !isDoctor && !isFamily)
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const todayStr = new Date().toDateString();
    const dosesToday = med.doses
      .filter((d) => new Date(d.date).toDateString() === todayStr)
      .map((d) => ({
        doseId: d.doseId,
        time: d.time,
        taken:
          d.taken === true ? "taken" : d.taken === false ? "missed" : "pending",
        date: d.date,
      }));

    return NextResponse.json({
      success: true,
      medication: { ...med.toObject(), doses: dosesToday },
    });
  } catch (err) {
    console.error("GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
