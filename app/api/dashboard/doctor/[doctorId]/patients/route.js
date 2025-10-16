import connectToDB from "../../../../../../lib/db.js";
import User from "../../../../../../models/User.js";
import Report from "../../../../../../models/Report.js";
import { calculateCompliance } from "../../../../../../lib/complianceHelper.js";
import mongoose from "mongoose";

export async function GET(req, { params }) {
  try {
    await connectToDB();
    const { doctorId } = params;

    const doctor = await User.findById(doctorId)
      .populate("patients", "name email") // 🧩 populate to get names/emails
      .select("name role patients");

    if (!doctor || doctor.role !== "doctor") {
      return new Response(
        JSON.stringify({ error: "Unauthorized or not a doctor" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const patients = doctor.patients || [];

    // Fetch data for each patient
    const patientData = await Promise.all(
      patients.map(async (p) => {
        const patientId = p._id;

        const compliance = await calculateCompliance(patientId, false);

        const reportCount = await Report.countDocuments({
          doctor: doctorId,
          patient: patientId,
        });

        return {
          patientId,
          patientName: p.name || "Unnamed Patient",
          patientEmail: p.email || "No email",
          complianceTotal: compliance.compliancePercentage || 0,
          dosesTaken: compliance.totalTaken || 0,
          dosesMissed: compliance.totalMissed || 0,
          dosesPending: compliance.totalPending || 0,
          totalReports: reportCount || 0,
        };
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          doctorId: doctor._id,
          doctorName: doctor.name,
          totalPatients: patientData.length,
          patients: patientData,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Doctor patients dashboard error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch patients: " + err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
