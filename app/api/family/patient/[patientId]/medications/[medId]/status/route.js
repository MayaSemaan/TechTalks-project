import connectToDB from "../../../../../../../../lib/db.js";
import Medication from "../../../../../../../../models/Medication.js";
import User from "../../../../../../../../models/User.js";
import { authenticate } from "../../../../../../../../middlewares/auth.js";
import mongoose from "mongoose";

// Helper to respond JSON
const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// Parse doseId of form "<ISO-date>-<idx>" safely by splitting at last hyphen
const parseDoseId = (doseId) => {
  if (typeof doseId !== "string") return null;
  const lastHyphen = doseId.lastIndexOf("-");
  if (lastHyphen === -1) return null;
  const datePart = doseId.slice(0, lastHyphen);
  const idxStr = doseId.slice(lastHyphen + 1);
  const idx = parseInt(idxStr, 10);
  if (isNaN(idx)) return null;
  const date = new Date(datePart);
  if (isNaN(date.getTime())) return null;
  return { date, idx, datePart };
};

// Normalize a Date to UTC midnight (so comparisons are date-only)
const toDateOnlyUTC = (d) => {
  const dt = new Date(d);
  // create a new date at UTC midnight for that date
  return new Date(
    Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate())
  );
};

// Generate a dose object for a med and a parsed doseId (date & idx)
const generateDoseFromParsed = (med, parsed) => {
  if (!parsed) return null;
  if (!Array.isArray(med.times) || med.times.length === 0) return null;
  const time = med.times[parsed.idx] ?? med.times[0] ?? "00:00";
  const dateIso = toDateOnlyUTC(parsed.date).toISOString();
  return {
    doseId: `${dateIso}-${parsed.idx}`,
    date: dateIso,
    time,
    taken: null,
  };
};

// Check whether a dose date is within med start/end (date-only comparison).
// If med.startDate is missing, we treat as allowed (return true).
const isDoseInRange = (med, doseDate) => {
  // if no startDate defined, allow (frontend might not have provided start)
  if (!med.startDate) return true;

  const start = toDateOnlyUTC(med.startDate);
  const end = med.endDate ? toDateOnlyUTC(med.endDate) : null;
  const d = toDateOnlyUTC(doseDate);

  if (d < start) return false;
  if (end && d > end) return false;
  return true;
};

export async function PATCH(req, { params }) {
  try {
    const user = await authenticate(req); // family or patient
    await connectToDB();

    const { medId, patientId } = params;
    const body = await req.json();
    const { doseId, taken } = body ?? {};

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(medId))
      return jsonResponse(
        { success: false, message: "Invalid medication ID" },
        400
      );
    if (!mongoose.Types.ObjectId.isValid(patientId))
      return jsonResponse(
        { success: false, message: "Invalid patient ID" },
        400
      );
    if (!doseId || typeof doseId !== "string")
      return jsonResponse(
        { success: false, message: "Missing or invalid doseId" },
        400
      );
    if (typeof taken !== "boolean")
      return jsonResponse(
        {
          success: false,
          message: "Missing or invalid 'taken' (boolean required)",
        },
        400
      );

    const med = await Medication.findById(medId);
    if (!med)
      return jsonResponse(
        { success: false, message: "Medication not found" },
        404
      );

    // Authorization
    if (user.role === "family") {
      const patient = await User.findById(patientId);
      if (!patient)
        return jsonResponse(
          { success: false, message: "Patient not found" },
          404
        );

      // ensure linkedFamily contains user
      if (
        !Array.isArray(patient.linkedFamily) ||
        !patient.linkedFamily.map(String).includes(String(user._id))
      ) {
        return jsonResponse({ success: false, message: "Not authorized" }, 403);
      }
      // ensure med belongs to patient
      if (String(med.userId) !== String(patientId)) {
        return jsonResponse(
          {
            success: false,
            message: "Medication does not belong to this patient",
          },
          400
        );
      }
    } else {
      // logged-in user must be the medication owner
      if (String(user._id) !== String(med.userId)) {
        return jsonResponse({ success: false, message: "Not authorized" }, 403);
      }
    }

    // Ensure doses array exists
    med.doses = med.doses || [];

    // Find dose by doseId
    let dose = med.doses.find((d) => String(d.doseId) === String(doseId));

    if (!dose) {
      // Try to parse doseId and generate if valid
      const parsed = parseDoseId(doseId);
      if (!parsed) {
        return jsonResponse(
          { success: false, message: `Invalid doseId format: ${doseId}` },
          400
        );
      }

      const newDose = generateDoseFromParsed(med, parsed);
      if (!newDose) {
        return jsonResponse(
          {
            success: false,
            message: `Could not generate dose for id ${doseId}`,
          },
          400
        );
      }

      // Validate date range against med start/end (normalized)
      if (!isDoseInRange(med, newDose.date)) {
        return jsonResponse(
          { success: false, message: "Dose not valid for this day" },
          400
        );
      }

      // push into med.doses
      med.doses.push(newDose);
      dose = med.doses[med.doses.length - 1]; // reference to the inserted object
    }

    // Update status
    dose.taken = taken;
    await med.save();

    // Return updated doses for frontend convenience
    const updatedDoses = med.doses.map((d) => ({
      doseId: d.doseId,
      date: d.date,
      time: d.time,
      taken: d.taken,
    }));

    return jsonResponse(
      { success: true, data: { _id: med._id, doses: updatedDoses } },
      200
    );
  } catch (err) {
    console.error("PATCH /medications/status error:", err);
    // If authenticate threw an error, return 401 instead of 500
    if (err?.message?.toLowerCase?.().includes("unauthor")) {
      return jsonResponse({ success: false, message: "Unauthorized" }, 401);
    }
    return jsonResponse({ success: false, message: "Server error" }, 500);
  }
}
