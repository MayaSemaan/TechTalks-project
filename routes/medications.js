const express = require('express');
const router = express.Router();
const Medication = require('../models/Medication');

//CRUDs
// CREATE Medication
router.post('/', async (req, res) => {
    try {
        const medication = new Medication(req.body);
        const savedMedication = await medication.save();
        res.status(201).json(savedMedication);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// READ all Medications
router.get('/', async (req, res) => {
    try {
        const medications = await Medication.find();
        res.json(medications);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// READ single Medication by ID
router.get('/:id', async (req, res) => {
    try {
        const medication = await Medication.findById(req.params.id);
        if (!medication) return res.status(404).json({ message: 'Medication not found' });
        res.json(medication);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// UPDATE Medication
router.put('/:id', async (req, res) => {
    try {
        const updatedMedication = await Medication.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedMedication) return res.status(404).json({ message: 'Medication not found' });
        res.json(updatedMedication);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE Medication
router.delete('/:id', async (req, res) => {
    try {
        const deletedMedication = await Medication.findByIdAndDelete(req.params.id);
        if (!deletedMedication) return res.status(404).json({ message: 'Medication not found' });
        res.json({ message: 'Medication deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
