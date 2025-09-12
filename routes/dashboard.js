
const express = require('express');
const router = express.Router();
const Medication = require('../models/Medication');
const ReminderLog = require('../models/ReminderLog');

// GET /dashboard/:userId
router.get('/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find medications for this user
    const medications = await Medication.find({ userId });

    // Fetch reminder logs for each medication
    const dashboardData = await Promise.all(
      medications.map(async (med) => {
        const logs = await ReminderLog.find({ medicationId: med._id }).sort({ timestamp: -1 });

        return {
          medicationId: med._id,
          name: med.name,
          dosage: med.dosage,
          schedule: med.schedule,
          currentStatus: med.status,
          history: logs.map(log => ({
            timestamp: log.timestamp,
            status: log.status
          }))
        };
      })
    );

    res.json({ userId, medications: dashboardData });
  } catch (error) {
    console.error('Error in dashboard route:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;