// app/api/family/patient/[patientId]/medications/[medId]/status/route.js
import connectToDB from "../../../../../../../../lib/db.js";
import Medication from "../../../../../../../../models/Medication.js";
import User from "../../../../../../../../models/User.js";
import { authenticate } from "../../../../../../../../middlewares/auth.js";
import mongoose from "mongoose";

export async function PATCH(req, { params }) {
  try {
    const user = await authenticate(req); // family or patient
    await connectToDB();

    const { medId, patientId } = params;
    const body = await req.json();
    const { doseId, taken } = body ?? {};

    // Validate medId and patientId (ObjectId)
    if (!mongoose.Types.ObjectId.isValid(medId)) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid medication ID" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid patient ID" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate request body
    if (!doseId || typeof doseId !== "string") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing or invalid doseId (should be string)",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (typeof taken !== "boolean") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing or invalid 'taken' (boolean required)",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Find medication
    const med = await Medication.findById(medId);
    if (!med) {
      return new Response(
        JSON.stringify({ success: false, message: "Medication not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Authorization:
    // - if family, ensure the family member is linked to the patientId
    // - if patient, ensure the patient owns the medication
    if (String(user.role) === "family") {
      const patient = await User.findById(patientId);
      if (!patient) {
        return new Response(
          JSON.stringify({ success: false, message: "Patient not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
      const linkedFamilyStrings = (patient.linkedFamily || []).map(String);
      if (!linkedFamilyStrings.includes(String(user._id))) {
        return new Response(
          JSON.stringify({ success: false, message: "Not authorized" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      // also ensure med.userId matches patientId
      if (String(med.userId) !== String(patientId)) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Medication does not belong to this patient",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    } else {
      // logged-in user must be the medication owner
      if (String(user._id) !== String(med.userId)) {
        return new Response(
          JSON.stringify({ success: false, message: "Not authorized" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Find dose by string equality (doseId is UUID string in your schema)
    const dose = med.doses.find((d) => String(d.doseId) === String(doseId));

    if (!dose) {
      // helpful debug info in message, but keep it brief
      return new Response(
        JSON.stringify({
          success: false,
          message: `Dose ${doseId} not found for medication ${medId}`,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Update
    dose.taken = taken;
    await med.save();

    // Return updated doses only (frontend convenience)
    const updatedDoses = med.doses.map((d) => ({
      doseId: d.doseId,
      date: d.date,
      time: d.time,
      taken: d.taken,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: { _id: med._id, doses: updatedDoses },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("PATCH /medications/status error:", err);
    return new Response(
      JSON.stringify({ success: false, message: "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
