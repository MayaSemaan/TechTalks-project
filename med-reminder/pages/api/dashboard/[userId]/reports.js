// File: /pages/api/dashboard/[userId]/reports.js
// Include doctor reports in dashboard
// ============================================

import { connectDB } from '@/lib/mongodb';
import Report from '@/models/report';
import User from '@/models/user';
import { calculateCompliance } from '@/lib/complianceHelper';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { userId } = req.query;
    const { limit = '10', includeCompliance = 'true' } = req.query;

    // Verify user exists and get their role
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let reports;

    if (user.role === 'doctor') {
      // Doctor can see all reports they created
      reports = await Report.find({ doctorId: userId })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .populate('patientId', 'name email');
    } else if (user.role === 'patient') {
      // Patient can see their own reports
      reports = await Report.find({ patientId: userId })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .populate('doctorId', 'name email specialization');
    } else {
      return res.status(403).json({ error: 'Unauthorized role' });
    }

    // Optionally include compliance data with each report
    let reportsWithCompliance = reports;
    
    if (includeCompliance === 'true' && user.role === 'doctor') {
      reportsWithCompliance = await Promise.all(reports.map(async (report) => {
        const reportObj = report.toObject();
        
        // Calculate compliance for the patient in the report
        const patientCompliance = await calculateCompliance(
          report.patientId._id,
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          new Date()
        );

        return {
          ...reportObj,
          patientCompliance: patientCompliance.compliancePercentage
        };
      }));
    }

    res.status(200).json({
      success: true,
      data: {
        reports: reportsWithCompliance.map(report => ({
          reportId: report._id,
          title: report.title,
          description: report.description,
          fileUrl: report.fileUrl,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
          ...(user.role === 'doctor' && {
            patientName: report.patientId?.name,
            patientEmail: report.patientId?.email,
            patientCompliance: report.patientCompliance
          }),
          ...(user.role === 'patient' && {
            doctorName: report.doctorId?.name,
            doctorSpecialization: report.doctorId?.specialization
          })
        })),
        totalReports: reports.length
      }
    });
  } catch (error) {
    console.error('Reports dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
}