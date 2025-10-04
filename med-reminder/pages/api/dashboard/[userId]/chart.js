// File: /pages/api/dashboard/[userId]/charts.js
// Get chart data for dashboard visualization


import { connectDB } from '@/lib/mongodb';
import Medication from '@/models/medication';
import ReminderLog from '@/models/reminderlog';
import { calculateCompliance } from '@/lib/complianceHelper';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { userId } = req.query;
    const { days = '30' } = req.query;

    const end = new Date();
    const start = new Date(end.getTime() - (parseInt(days) * 24 * 60 * 60 * 1000));

    // Get daily compliance data
    const dailyData = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dayCompliance = await calculateCompliance(userId, dayStart, dayEnd);

      dailyData.push({
        date: dayStart.toISOString().split('T')[0],
        compliancePercentage: dayCompliance.compliancePercentage,
        taken: dayCompliance.totalTaken,
        missed: dayCompliance.totalMissed
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get medication breakdown
    const medications = await Medication.find({ userId });
    const medBreakdown = await Promise.all(medications.map(async (med) => {
      const logs = await ReminderLog.find({
        userId,
        medicationId: med._id,
        timestamp: { $gte: start, $lte: end }
      });

      const taken = logs.filter(log => log.status === 'taken').length;
      const missed = logs.filter(log => log.status === 'missed').length;

      return {
        name: med.name,
        taken,
        missed,
        total: taken + missed
      };
    }));

    res.status(200).json({
      success: true,
      data: {
        dailyCompliance: dailyData,
        medicationBreakdown: medBreakdown
      }
    });
  } catch (error) {
    console.error('Charts endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
}