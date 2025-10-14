import { NextResponse } from "next/server";
import connectToDB from "../../../../lib/db.js";
import Medication from "../../../../models/Medication.js";
import Report from "../../../../models/Report.js";

export async function GET(req, { params }) {
  try {
    await connectToDB();

    const { userId } = params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch medications for the user
    const medications = await Medication.find({ userId });

    const medicationsData = medications.map((med) => {
      const medStart = med.startDate ? new Date(med.startDate) : null;
      const medEnd = med.endDate ? new Date(med.endDate) : null;

      let dosesTaken = 0;
      let dosesMissed = 0;
      let dosesPending = 0;

      med.doses.forEach((dose) => {
        const doseDate = new Date(dose.date);
        if (
          (!medStart || doseDate >= medStart) &&
          (!medEnd || doseDate <= medEnd)
        ) {
          if (dose.taken === true) dosesTaken++;
          else if (dose.taken === false) dosesMissed++;
          else dosesPending++;
        }
      });

      const totalDoses = dosesTaken + dosesMissed + dosesPending;
      const compliance = totalDoses ? (dosesTaken / totalDoses) * 100 : 0;

      return {
        _id: med._id,
        name: med.name,
        dosage: med.dosage,
        unit: med.unit,
        type: med.type,
        schedule: med.schedule,
        startDate: med.startDate,
        endDate: med.endDate,
        reminders: med.reminders,
        notes: med.notes,
        times: med.times,
        dosesTaken,
        dosesMissed,
        dosesPending,
        compliance: parseFloat(compliance.toFixed(2)),
      };
    });

    // Fetch reports for the user
    const reports = await Report.find({ patient: userId });

    return new Response(
      JSON.stringify({
        medications: medicationsData || [],
        reports: reports || [],
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Dashboard GET error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to load dashboard data" }),
      { status: 500 }
    );
  }
}
