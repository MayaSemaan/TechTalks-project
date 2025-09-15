

const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Medication = require('../models/medication');
const ReminderLog = require('../models/reminderlogs');

// Helper functions
function calculateAdherenceRate(taken, total) {
  if (total === 0) return 0;
  return Math.round((taken / total) * 100);
}

function formatTimeUntil(scheduledTime) {
  const now = new Date();
  const scheduled = new Date(scheduledTime);
  const diffMs = scheduled.getTime() - now.getTime();
  
  if (diffMs < 0) return 'Overdue';
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHours > 0) {
    return $,{diffHours},h, $,{diffMinutes},m;
  } else {
    return $,{diffMinutes},m;
  }
}

// ----------------- GET DASHBOARD -----------------
router.get('/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeframe = '7d' } = req.query;

    // Fetch user info
    const user = await User.findById(userId);

    // Initialize dashboard structure
    const dashboardData = {
      user: {
        id: userId,
        name: user ? user.name : '',
        role: user ? user.role : ''
      },
      summary: {
        totalMedications: 0,
        activeMedications: 0,
        adherenceRate: 0,
        upcomingToday: 0,
        missedToday: 0
      },
      upcomingMedications: [],
      recentActivity: [],
      adherenceHistory: {
        timeframe: timeframe,
        data: []
      },
      medicationBreakdown: []
    };

    // Fetch medications
    const medications = await Medication.find({ userId });

    dashboardData.summary.totalMedications = medications.length;
    dashboardData.summary.activeMedications = medications.length; // For simplicity, all active

    // Fetch reminder logs
    const reminderLogs = await ReminderLog.find({ userId }).sort({ timestamp: -1 });

    // Recent activity
    dashboardData.recentActivity = reminderLogs.slice(0, 10).map(log => ({
      medicationId: log.medicationId,
      medicationName: medications.find(m => m._id.toString() === log.medicationId.toString())?.name || '',
      timestamp: log.timestamp,
      status: log.status,
      reminderType: log.reminderType
    }));

    // Medication breakdown
    dashboardData.medicationBreakdown = medications.map(med => {
      const medLogs = reminderLogs.filter(l => l.medicationId.toString() === med._id.toString());
      const taken = medLogs.filter(l => l.status === 'taken').length;
      const missed = medLogs.filter(l => l.status === 'missed').length;
      return {
        medicationId: med._id,
        name: med.name,
        totalScheduled: medLogs.length,
        taken,
        missed,
        adherenceRate: calculateAdherenceRate(taken, medLogs.length)
      };
    });

    // Upcoming today
    const today = new Date();
    dashboardData.upcomingMedications = medications.flatMap(med => {
      return med.schedule
        .map(s => new Date(s))
        .filter(sch => sch.toDateString() === today.toDateString())
        .map(sch => ({
          medicationId: med._id,
          name: med.name,
          dosage: med.dosage,
          scheduledTime: sch.toISOString(),
          status: 'pending', // for simplicity
          timeUntil: formatTimeUntil(sch)
        }));
    });
    dashboardData.summary.upcomingToday = dashboardData.upcomingMedications.length;

    // Missed today
    dashboardData.summary.missedToday = reminderLogs.filter(log => {
      const ts = new Date(log.timestamp);
      return ts.toDateString() === today.toDateString() && log.status === 'missed';
    }).length;

    // Overall adherence rate
    const totalTaken = reminderLogs.filter(l => l.status === 'taken').length;
    const totalLogs = reminderLogs.length;
    dashboardData.summary.adherenceRate = calculateAdherenceRate(totalTaken, totalLogs);

    // ----------------- WEEKLY ADHERENCE HISTORY -----------------
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6); // last 7 days
    let weeklyHistory = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      const dayStart = new Date(day.setHours(0,0,0,0));
      const dayEnd = new Date(day.setHours(23,59,59,999));

      const taken = await ReminderLog.countDocuments({
        userId,
        status: 'taken',
        timestamp: { $gte: dayStart, $lte: dayEnd }
      });

      const missed = await ReminderLog.countDocuments({
        userId,
        status: 'missed',
        timestamp: { $gte: dayStart, $lte: dayEnd }
      });

      weeklyHistory.push({
        date: dayStart.toISOString().split('T')[0],
        taken,
        missed,
        adherenceRate: taken + missed === 0 ? 0 : Math.round((taken / (taken + missed)) * 100)
      });
    }

    dashboardData.adherenceHistory = {
      timeframe: '7d',
      data: weeklyHistory
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
});

// ----------------- DASHBOARD CHARTS -----------------
router.get('/dashboard/:userId/charts', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type = 'adherence', timeframe = '7d' } = req.query;

    const chartData = {
      type,
      timeframe,
      data: {
        labels: [],
        datasets: []
      }
    };

    switch (type) {
      case 'adherence':
        chartData.data.labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
        chartData.data.datasets = [
          {
            label: 'Adherence Rate (%)',
            data: [], // populate dynamically if needed
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)'
          }
        ];
        break;

      case 'medication_times':
        chartData.data.labels = ['Morning','Afternoon','Evening','Night'];
        chartData.data.datasets = [
          {
            label: 'Medications Taken',
            data: [],
            backgroundColor: ['#FF6384','#36A2EB','#FFCE56','#4BC0C0']
          }
        ];
        break;

      case 'weekly_summary':
        chartData.data.labels = []; // last 4 weeks
        chartData.data.datasets = [
          { label: 'Taken', data: [], backgroundColor: 'rgba(75, 192, 192, 0.8)' },
          { label: 'Missed', data: [], backgroundColor: 'rgba(255, 99, 132, 0.8)' }
        ];
        break;
    }

    res.json({ success: true, data: chartData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching chart data', error: error.message });
  }
});

// ----------------- NOTIFICATIONS -----------------
router.get('/dashboard/:userId/notifications', async (req, res) => {
  try {
    const { userId } = req.params;

    const notificationData = {
      preferences: {
        emailReminders: true,
        familyAlerts: true,
        reminderFrequency: 15,
        familyMembers: []
      },
      recentNotifications: []
    };

    res.json({ success: true, data: notificationData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching notification data', error: error.message });
  }
});
module.exports = router;