import connectToDB from "../../../../../../lib/db.js";
import User from "../../../../../../models/User.js";
import Report from "../../../../../../models/Report.js";
import { calculateCompliance } from "../../../../../../lib/complianceHelper.js";

export async function GET(req, { params }) {
  try {
    await connectToDB();

    const { doctorId } = params;

    // Ensure the doctor exists and has the correct role
    const doctor = await User.findById(doctorId).select("name role patients");
    if (!doctor || doctor.role !== "doctor") {
      return new Response(
        JSON.stringify({ error: "Unauthorized or not a doctor" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const patients = doctor.patients || [];

    // Fetch patient info with compliance and report counts
    const patientData = await Promise.all(
      patients.map(async (patientId) => {
        const patient = await User.findById(patientId).select("name email");
        if (!patient) return null;

        const compliance = await calculateCompliance(patientId, false); // include all doses

        const reportCount = await Report.countDocuments({
          doctor: doctorId,
          patient: patientId,
        });

        return {
          patientId: patient._id,
          patientName: patient.name,
          patientEmail: patient.email,
          complianceTotal: compliance.compliancePercentage,
          dosesTaken: compliance.totalTaken,
          dosesMissed: compliance.totalMissed,
          dosesPending: compliance.totalPending,
          totalReports: reportCount,
        };
      })
    );

    const validPatients = patientData.filter((p) => p !== null);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          doctorId: doctor._id,
          doctorName: doctor.name,
          totalPatients: validPatients.length,
          patients: validPatients,
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
