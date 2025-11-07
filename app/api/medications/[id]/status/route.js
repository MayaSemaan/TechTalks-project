import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDB from "../../../../../lib/db.js";
import Medication from "../../../../../models/Medication.js";
import { authenticate } from "../../../../../middlewares/auth.js";

// Helper: Compare dates safely (ignore time)
const isSameDay = (d1, d2) => {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// Helper: check if med occurs on a given date
function isMedicationForDate(med, date) {
  if (!med.startDate) return false;

  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const start = new Date(med.startDate);
  start.setHours(0, 0, 0, 0);

  if (d < start) return false;

  const end = med.endDate ? new Date(med.endDate) : null;
  if (end) {
    end.setHours(0, 0, 0, 0);
    if (d > end) return false;
  }

  const diffDays = Math.floor((d - start) / (1000 * 60 * 60 * 24));
  const schedule = med.schedule || "daily";
  const customNumber = med.customInterval?.number || 1;
  const customUnit = med.customInterval?.unit?.toLowerCase() || "day";

  switch (schedule) {
    case "daily":
      return true;
    case "weekly":
      return start.getDay() === d.getDay();
    case "monthly":
      return start.getDate() === d.getDate();
    case "custom":
      if (customUnit.startsWith("day")) return diffDays % customNumber === 0;
      if (customUnit.startsWith("week")) {
        const diffWeeks = Math.floor(diffDays / 7);
        return diffWeeks % customNumber === 0 && start.getDay() === d.getDay();
      }
      if (customUnit.startsWith("month")) {
        const monthsDiff =
          (d.getFullYear() - start.getFullYear()) * 12 +
          (d.getMonth() - start.getMonth());
        return (
          monthsDiff % customNumber === 0 && start.getDate() === d.getDate()
        );
      }
      return false;
    default:
      return false;
  }
}

// Helper: generate dose object
function generateDose(med, idx, date) {
  const dayStr = date.toISOString().split("T")[0];
  return {
    doseId: `${med._id}-${idx}-${dayStr}`,
    date: date.toISOString(),
    time: med.times[idx],
    taken: null,
  };
}

// Helper: get overall status for a date
const getStatusForDate = (med, date = new Date()) => {
  const dosesForDate = med.doses.filter((d) => isSameDay(d.date, date));
  if (dosesForDate.length === 0) return "pending";
  const allTaken = dosesForDate.every((d) => d.taken === true);
  const allMissed = dosesForDate.every((d) => d.taken === false);
  return allTaken ? "taken" : allMissed ? "missed" : "pending";
};

export async function PATCH(req, { params }) {
  try {
    const user = await authenticate(req);
    if (user.role !== "patient")
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectToDB();
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return NextResponse.json(
        { error: "Invalid medication ID" },
        { status: 400 }
      );

    const { doseId, status, date } = await req.json();
    if (!doseId || typeof status === "undefined")
      return NextResponse.json(
        { error: "doseId and status are required" },
        { status: 400 }
      );

    const normalizedStatus =
      status === true ? "taken" : status === false ? "missed" : "pending";
    if (!["taken", "missed", "pending"].includes(normalizedStatus))
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );

    const med = await Medication.findById(id);
    if (!med)
      return NextResponse.json(
        { error: "Medication not found" },
        { status: 404 }
      );
    if (med.userId.toString() !== user._id.toString())
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // --- Find or create dose ---
    let dose = med.doses.find(
      (d) => d.doseId === doseId && isSameDay(d.date, targetDate)
    );

    if (!dose) {
      const idx = med.times.findIndex(
        (_, i) =>
          `${med._id}-${i}-${targetDate.toISOString().split("T")[0]}` === doseId
      );
      if (idx === -1)
        return NextResponse.json({ error: "Invalid doseId" }, { status: 400 });

      // Always create dose for this date
      dose = generateDose(med, idx, targetDate);
      med.doses.push(dose);
    }

    // --- Update dose status ---
    dose.taken =
      normalizedStatus === "taken"
        ? true
        : normalizedStatus === "missed"
        ? false
        : null;

    await med.save();

    return NextResponse.json({
      success: true,
      updatedDose: dose,
      medicationStatus: getStatusForDate(med, targetDate),
    });
  } catch (err) {
    console.error("PATCH /status error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
