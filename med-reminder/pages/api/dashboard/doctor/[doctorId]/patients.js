// File: /pages/api/dashboard/doctor/[doctorId]/patients.js
// Doctor dashboard - view all patients and their compliance
// ============================================

import { connectDB } from '@/lib/mongodb';
import User from '@/models/user';
import Report from '@/models/report';
import { calculateCompliance } from '@/lib/complianceHelper';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { doctorId } = req.query;

    // Verify doctor exists
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({ error: 'Unauthorized or not a doctor' });
    }

    // Get all patients linked to this doctor
    const patients = doctor.patients || [];
    
    // Get patient details with compliance
    const patientData = await Promise.all(patients.map(async (patientId) => {
      const patient = await User.findById(patientId).select('name email');
      if (!patient) return null;

      // Calculate 30-day compliance
      const compliance = await calculateCompliance(
        patientId,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date()
      );

      // Get report count
      const reportCount = await Report.countDocuments({
        doctorId,
        patientId
      });

      return {
        patientId: patient._id,
        patientName: patient.name,
        patientEmail: patient.email,
        compliance30Days: compliance.compliancePercentage,
        dosesTaken: compliance.totalTaken,
        dosesMissed: compliance.totalMissed,
        totalReports: reportCount
      };
    }));

    // Filter out null values
    const validPatients = patientData.filter(p => p !== null);

    res.status(200).json({
      success: true,
      data: {
        doctorId,
        doctorName: doctor.name,
        totalPatients: validPatients.length,
        patients: validPatients
      }
    });
  } catch (error) {
    console.error('Doctor patients dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
}