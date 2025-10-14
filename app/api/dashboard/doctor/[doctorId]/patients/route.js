import connectToDB from "../../../../../../lib/db.js";
import User from "../../../../../../models/User.js";
import Report from "../../../../../../models/Report.js";
import { calculateCompliance } from "../../../../../../lib/complianceHelper.js";

export async function GET(req, context) {
  try {
    await connectToDB();

    const { doctorId } = await context.params;

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "doctor") {
      return new Response(
        JSON.stringify({ error: "Unauthorized or not a doctor" }),
        { status: 403 }
      );
    }

    const patients = doctor.patients || [];

    const patientData = await Promise.all(
      patients.map(async (patientId) => {
        const patient = await User.findById(patientId).select("name email");
        if (!patient) return null;

        // Correct compliance calculation
        const compliance = await calculateCompliance(patientId, false); // all doses

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

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          doctorId,
          doctorName: doctor.name,
          totalPatients: patientData.filter((p) => p !== null).length,
          patients: patientData.filter((p) => p !== null),
        },
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Doctor patients dashboard error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}
