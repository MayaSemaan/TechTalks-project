const express = require('express');
const router = express.Router();
const Report = require('../models/report');
const mongoose = require('mongoose');

// GET /reports/:patientId
router.get('/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(patientId)) return res.status(400).json({ error: 'Invalid patientId' });

    const reports = await Report.find({ patient: patientId }).sort({ uploadedAt: -1 }).lean();
    res.json(reports.map(r => ({ id: r._id, title: r.title, fileUrl: r.fileUrl, uploadedAt: r.uploadedAt })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;