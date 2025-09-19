const express = require('express');
const router = express.Router();

const Medication = require('../models/medication');
const Report = require('../models/report');
const mongoose = require('mongoose');

// GET /dashboard/:userId
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: 'Invalid userId' });

    // 1) fetch meds & reports
    const meds = await Medication.find({ patient: userId }).lean();
    const reports = await Report.find({ patient: userId }).sort({ uploadedAt: -1 }).lean();

    // 2) compute simple adherence metrics
    let totalDoses = 0;
    let takenDoses = 0;

    // Build a date-keyed history map for the last 30 days
    const DAYS = 30;
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (DAYS - 1));

    // initialize map for charting
    const dayMap = {};
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      dayMap[key] = { date: key, taken: 0, missed: 0 };
    }

    meds.forEach(m => {
      if (!Array.isArray(m.doses)) return;
      m.doses.forEach(dose => {
        const date = new Date(dose.date);
        const key = date.toISOString().slice(0, 10);
        if (key in dayMap) {
          dayMap[key][dose.taken ? 'taken' : 'missed'] += 1;
        }
        totalDoses += 1;
        if (dose.taken) takenDoses += 1;
      });
    });

    const chartData = Object.values(dayMap);
    const adherencePercent = totalDoses === 0 ? null : Math.round((takenDoses / totalDoses) * 100);

    const payload = {
      metrics: {
        totalDoses,
        takenDoses,
        adherencePercent
      },
      chartData, // array of {date, taken, missed}
      meds: meds.map(m => ({ id: m._id, name: m.name })),
      reports: reports.map(r => ({ id: r._id, title: r.title, fileUrl: r.fileUrl, uploadedAt: r.uploadedAt }))
    };

    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;