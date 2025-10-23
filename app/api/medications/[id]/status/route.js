import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDB from "../../../../../lib/db.js";
import Medication from "../../../../../models/Medication.js";
import { authenticate } from "../../../../../middlewares/auth.js";

// Helper to compute today's status dynamically
const getStatusForDate = (med, date = new Date()) => {
  const todayStr = date.toDateString();
  const todayDoses = med.doses.filter(
    (d) => new Date(d.date).toDateString() === todayStr
  );
  if (todayDoses.length === 0) return "pending";
  const allTaken = todayDoses.every((d) => d.taken === true);
  const allMissed = todayDoses.every((d) => d.taken === false);
  return allTaken ? "taken" : allMissed ? "missed" : "pending";
};

export async function PATCH(req, { params }) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return NextResponse.json(
        { error: "Invalid medication ID" },
        { status: 400 }
      );

    const { doseId, status } = await req.json();
    if (!doseId || !status)
      return NextResponse.json(
        { error: "doseId and status are required" },
        { status: 400 }
      );

    const normalizedStatus = status.toLowerCase();
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

    // Authorization (Owner or linked Family)
    const isOwner = med.userId.toString() === user._id.toString();
    let isFamily = false;

    if (user.role === "family") {
      const patient = await mongoose.model("User").findById(med.userId);
      if (
        patient?.linkedFamily?.some(
          (fid) => fid.toString() === user._id.toString()
        )
      ) {
        isFamily = true;
      }
    }

    if (!isOwner && !isFamily)
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    // Ensure startDate and dose dates
    if (!med.startDate) med.startDate = new Date();
    med.doses.forEach((d) => {
      if (!d.date) d.date = med.startDate;
    });

    // Update **only today's dose**
    const todayStr = new Date().toDateString();
    const dose = med.doses.find(
      (d) => d.doseId === doseId && new Date(d.date).toDateString() === todayStr
    );

    if (!dose)
      return NextResponse.json(
        { error: "Dose not found for today" },
        { status: 404 }
      );

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
        taken: normalizedStatus,
        date: dose.date,
      },
      medicationStatus: getStatusForDate(med),
    });
  } catch (err) {
    console.error("PATCH /status error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
