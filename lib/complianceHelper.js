import Medication from "../models/Medication.js";

/**
 * Check if dose is in the past (before today)
 */
function isPastDose(doseDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const d = new Date(doseDate);
  d.setHours(0, 0, 0, 0);

  return d < today;
}

/**
 * Calculate compliance for a user
 * - Past doses with null are treated as missed
 * - Future doses with null are pending
 * - Accepts custom start/end date (for API filtering)
 */
export async function calculateCompliance(userId, startDate, endDate) {
  const medications = await Medication.find({ userId });

  let totalExpected = 0;
  let totalTaken = 0;
  let totalMissed = 0;
  let totalPending = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Default: last 30 days if no dates provided
  if (!startDate || !endDate) {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    endDate = new Date();
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  for (const med of medications) {
    if (!Array.isArray(med.doses)) continue;

    // Filter doses within range
    const dosesInRange = med.doses.filter((d) => {
      const doseDate = new Date(d.date);
      doseDate.setHours(0, 0, 0, 0);
      return doseDate >= startDate && doseDate <= endDate;
    });

    totalExpected += dosesInRange.length;

    for (const d of dosesInRange) {
      const doseDate = new Date(d.date);
      doseDate.setHours(0, 0, 0, 0);

      let status;
      if (d.taken === true) {
        totalTaken++;
        status = "taken";
      } else if (d.taken === false) {
        totalMissed++;
        status = "missed";
      } else {
        // Null doses (not yet taken or missed)
        if (
          isPastDose(d.date) || // past date not taken
          (med.endDate && new Date(med.endDate) < today) // medication ended before today
        ) {
          totalMissed++;
          status = "missed (past or ended)";
        } else {
          totalPending++;
          status = "pending";
        }
      }

      console.log(
        `Medication: ${med.name}, Dose: ${d.time || "N/A"}, Date: ${
          doseDate.toISOString().split("T")[0]
        }, Taken: ${d.taken}, Counted as: ${status}`
      );
    }
  }

  const compliancePercentage =
    totalExpected > 0 ? ((totalTaken / totalExpected) * 100).toFixed(2) : 0;

  return {
    totalExpected,
    totalTaken,
    totalMissed,
    totalPending,
    compliancePercentage: parseFloat(compliancePercentage),
    dateRange: { startDate, endDate },
  };
}

/**
 * Get medication history for a user in a date range
 */
export async function getMedicationHistory(userId, startDate, endDate) {
  const medications = await Medication.find({ userId });

  const history = [];

  // Default to last 30 days if no date range
  if (!startDate || !endDate) {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    endDate = new Date();
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  for (const med of medications) {
    if (!Array.isArray(med.doses)) continue;

    const dosesInRange = med.doses.filter((d) => {
      const doseDate = new Date(d.date);
      doseDate.setHours(0, 0, 0, 0);
      return doseDate >= startDate && doseDate <= endDate;
    });

    history.push({
      medicationId: med._id,
      name: med.name,
      doses: dosesInRange.map((d) => ({
        doseId: d.doseId,
        date: d.date,
        time: d.time,
        taken: d.taken,
      })),
    });
  }

  return history;
}
