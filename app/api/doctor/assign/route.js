import connectToDB from "../../../../lib/db.js";
import User from "../../../../models/User.js";

export async function POST(req) {
  try {
    await connectToDB();

    const body = await req.json();
    const { doctorId, patientId } = body;

    // Validate doctor
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "doctor") {
      return new Response(
        JSON.stringify({ error: "Doctor not found or invalid role" }),
        { status: 404 }
      );
    }

    // Validate patient
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== "patient") {
      return new Response(
        JSON.stringify({ error: "Patient not found or invalid role" }),
        { status: 404 }
      );
    }

    // Initialize patients array if not exists
    if (!doctor.patients) doctor.patients = [];

    // Avoid duplicates
    if (!doctor.patients.includes(patientId)) {
      doctor.patients.push(patientId);
      await doctor.save();
    }

    return new Response(
      JSON.stringify({ success: true, message: "Patient assigned to doctor" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Assign patient error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
