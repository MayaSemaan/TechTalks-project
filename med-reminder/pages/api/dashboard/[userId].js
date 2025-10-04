//File: /pages/api/dashboard/[userId].js
// Main dashboard endpoint with overall statistics

import { connectDB } from '@/lib/mongodb';
import Medication from '@/models/medication';
import ReminderLog from '@/models/reminderlog';
import User from '@/models/user';
import { calculateCompliance } from '@/lib/complianceHelper';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { userId } = req.query;
    const { startDate, endDate, period = '7' } = req.query;

    // Set date range (default to last 7 days)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate 
      ? new Date(startDate) 
      : new Date(end.getTime() - (parseInt(period) * 24 * 60 * 60 * 1000));

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate compliance
    const compliance = await calculateCompliance(userId, start, end);

    // Get medication count
    const medicationCount = await Medication.countDocuments({ userId });

    // Get upcoming medications
    const upcomingMeds = await Medication.find({
      userId,
      status: 'active'
    }).select('name dosage schedule');

    // Get recent activity
    const recentLogs = await ReminderLog.find({
      userId,
      timestamp: { $gte: start, $lte: end }
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('medicationId', 'name dosage');

    res.status(200).json({
      success: true,
      data: {
        userId,
        userName: user.name,
        userRole: user.role,
        dateRange: { start, end },
        summary: {
          totalMedications: medicationCount,
          compliancePercentage: compliance.compliancePercentage,
          totalDosesTaken: compliance.totalTaken,
          totalDosesMissed: compliance.totalMissed,
          totalExpectedDoses: compliance.totalExpected
        },
        upcomingMedications: upcomingMeds,
        recentActivity: recentLogs.map(log => ({
          medicationName: log.medicationId?.name || 'Unknown',
          dosage: log.medicationId?.dosage || 'N/A',
          timestamp: log.timestamp,
          status: log.status
        }))
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
}