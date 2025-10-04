// File: /lib/complianceHelper.js
import Medication from '@/models/medication';
import ReminderLog from '@/models/reminderlog';

/**
 * Calculate compliance percentage for a user
 */
export async function calculateCompliance(userId, startDate, endDate) {
  try {
    // Get all medications for the user
    const medications = await Medication.find({ 
      userId,
      createdAt: { $lte: endDate }
    });

    // Get reminder logs within date range
    const reminderLogs = await ReminderLog.find({
      userId,
      timestamp: { $gte: startDate, $lte: endDate }
    });

    // Calculate total expected doses
    let totalExpected = 0;
    let totalTaken = 0;
    let totalMissed = 0;

    medications.forEach(med => {
      const medLogs = reminderLogs.filter(log => 
        log.medicationId.toString() === med._id.toString()
      );

      medLogs.forEach(log => {
        totalExpected++;
        if (log.status === 'taken') {
          totalTaken++;
        } else if (log.status === 'missed') {
          totalMissed++;
        }
      });
    });

    const compliancePercentage = totalExpected > 0 
      ? ((totalTaken / totalExpected) * 100).toFixed(2)
      : 0;

    return {
      totalExpected,
      totalTaken,
      totalMissed,
      compliancePercentage: parseFloat(compliancePercentage),
      dateRange: { startDate, endDate }
    };
  } catch (error) {
    throw new Error(`Error calculating compliance: ${error.message}`);
  }
}

/**
 * Get medication history with detailed breakdown
 */
export async function getMedicationHistory(userId, startDate, endDate) {
  try {
    const medications = await Medication.find({ userId });
    
    const history = await Promise.all(medications.map(async (med) => {
      const logs = await ReminderLog.find({
        userId,
        medicationId: med._id,
        timestamp: { $gte: startDate, $lte: endDate }
      }).sort({ timestamp: -1 });

      const taken = logs.filter(log => log.status === 'taken').length;
      const missed = logs.filter(log => log.status === 'missed').length;
      const total = taken + missed;
      const compliance = total > 0 ? ((taken / total) * 100).toFixed(2) : 0;

      return {
        medicationId: med._id,
        medicationName: med.name,
        dosage: med.dosage,
        schedule: med.schedule,
        totalDoses: total,
        dosesTaken: taken,
        dosesMissed: missed,
        complianceRate: parseFloat(compliance),
        logs: logs.map(log => ({
          timestamp: log.timestamp,
          status: log.status
        }))
      };
    }));

    return history;
  } catch (error) {
    throw new Error(`Error fetching medication history: ${error.message}`);
  }
}