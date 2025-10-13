import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDB from "../../../../../lib/db.js";
import Medication from "../../../../../models/Medication.js";
import { authenticate } from "../../../../../middlewares/auth.js";

// PATCH /api/medications/[id]/status
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

    // ✅ Authorization (Owner or linked Family)
    const isOwner = med.userId.toString() === user._id.toString();
    let isFamily = false;

    if (user.role === "family") {
      // Fetch the medication owner (patient)
      const patient = await mongoose.model("User").findById(med.userId);
      if (
        patient?.linkedFamily?.some(
          (fid) => fid.toString() === user._id.toString()
        )
      ) {
        isFamily = true;
      }
    }

    if (!isOwner && !isFamily) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // ✅ Ensure startDate and dose dates
    if (!med.startDate) med.startDate = new Date();
    med.doses.forEach((d) => {
      if (!d.date) d.date = med.startDate;
    });

    // ✅ Update the specific dose
    const dose = med.doses.find((d) => d.doseId === doseId);
    if (!dose)
      return NextResponse.json({ error: "Dose not found" }, { status: 404 });

    dose.taken =
      normalizedStatus === "taken"
        ? true
        : normalizedStatus === "missed"
        ? false
        : null;

    // ✅ Recalculate overall status
    const allTaken = med.doses.every((d) => d.taken === true);
    const allMissed = med.doses.every((d) => d.taken === false);
    med.status = allTaken ? "taken" : allMissed ? "missed" : "pending";

    await med.save();

    return NextResponse.json({
      success: true,
      updatedDose: {
        doseId: dose.doseId,
        time: dose.time,
        taken: normalizedStatus,
        date: dose.date,
      },
      medicationStatus: med.status,
    });
  } catch (err) {
    console.error("PATCH /status error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
