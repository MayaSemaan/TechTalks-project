import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDB from "../../../../../lib/db.js";
import Medication from "../../../../../models/Medication.js";
import { authenticate } from "../../../../../middlewares/auth.js";

// Helper: get overall status for a given date
const getStatusForDate = (med, date = new Date()) => {
  const targetStr = date.toDateString();
  const dosesForDate = med.doses.filter(
    (d) => new Date(d.date).toDateString() === targetStr
  );
  if (dosesForDate.length === 0) return "pending";
  const allTaken = dosesForDate.every((d) => d.taken === true);
  const allMissed = dosesForDate.every((d) => d.taken === false);
  return allTaken ? "taken" : allMissed ? "missed" : "pending";
};

export async function PATCH(req, { params }) {
  try {
    const user = await authenticate(req); // logged-in user

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

    // Normalize status
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

    // Ensure doses have valid dates
    if (!med.startDate) med.startDate = new Date();
    med.doses.forEach((d) => {
      if (!d.date) d.date = med.startDate;
    });

    // Use provided date or fallback to today
    const targetDate = date ? new Date(date) : new Date();
    const targetStr = targetDate.toDateString();

    // Find dose for the target date
    let dose = med.doses.find(
      (d) =>
        d.doseId === doseId && new Date(d.date).toDateString() === targetStr
    );

    // If dose does not exist, create it (for that day)
    if (!dose) {
      // Find the original dose in med.times
      const [medIdPart, idx] = doseId.split("-").slice(1); // extract index
      const time = med.times?.[Number(idx)] || "08:00";

      dose = {
        doseId,
        time,
        date: targetDate,
        taken: null,
      };
      med.doses.push(dose);
    }

    // Update taken status
    dose.taken =
      normalizedStatus === "taken"
        ? true
        : normalizedStatus === "missed"
        ? false
        : null;

    await med.save();

    return NextResponse.json({
      success: true,
      updatedDose: {
        doseId: dose.doseId,
        time: dose.time,
        taken: dose.taken,
        date: dose.date,
      },
      medicationStatus: getStatusForDate(med, targetDate),
    });
  } catch (err) {
    console.error("PATCH /status error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
