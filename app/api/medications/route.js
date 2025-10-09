import { NextResponse } from "next/server";
import connectToDB from "../../../lib/db.js";
import Medication from "../../../models/Medication.js";
import User from "../../../models/User.js";
import { authenticate } from "../../../middlewares/auth.js";
import mongoose from "mongoose";

// Safe date parser
const parseDateSafe = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

// Generate doses for each scheduled time
const generateDoses = (startDate, endDate, times, schedule, customInterval) => {
  if (!startDate || !times?.length) return [];

  const doses = [];
  let current = new Date(startDate);
  const lastDate = endDate ? new Date(endDate) : new Date(startDate);

  while (current <= lastDate) {
    times.forEach((time) => {
      const [hours, minutes] = time.split(":");
      const doseDate = new Date(current);
      doseDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      doses.push({ date: doseDate, taken: null, time }); // ✅ include time
    });

    if (schedule === "daily") current.setDate(current.getDate() + 1);
    else if (schedule === "weekly") current.setDate(current.getDate() + 7);
    else if (schedule === "monthly") current.setMonth(current.getMonth() + 1);
    else if (schedule === "custom" && customInterval) {
      if (customInterval.unit === "day")
        current.setDate(current.getDate() + customInterval.number);
      else if (customInterval.unit === "week")
        current.setDate(current.getDate() + customInterval.number * 7);
      else if (customInterval.unit === "month")
        current.setMonth(current.getMonth() + customInterval.number);
    } else break;
  }

  return doses;
};

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

    // Return medications with doses preserving status
    return NextResponse.json(
      meds.map((m) => ({
        ...m.toObject(),
        startDate: m.startDate?.toISOString() || null,
        endDate: m.endDate?.toISOString() || null,
        reminders: !!m.reminders,
        doses: (m.times || []).map((t) => {
          const dose = m.doses.find((d) => d.time === t) || {}; // ✅ match by time
          const status =
            dose.taken === true
              ? "taken"
              : dose.taken === false
              ? "missed"
              : "pending";
          return { time: t, taken: status, date: dose.date || null };
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

    // ✅ generate doses with time field
    const doses = (Array.isArray(data.times) ? data.times : []).map((time) => ({
      time,
      taken: null,
      date: parseDateSafe(data.startDate) || new Date(),
    }));

    const medData = {
      name: data.name || "Unnamed Medication",
      dosage: Number(data.dosage) || 0,
      unit: data.unit || "mg",
      type: data.type || "tablet",
      schedule: data.schedule,
      customInterval,
      times: Array.isArray(data.times) ? data.times : [],
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
