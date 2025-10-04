// File: /pages/api/dashboard/[userId]/compliance.js
// Detailed compliance data with filters
// ============================================

import { connectDB } from '@/lib/mongodb';
import { calculateCompliance, getMedicationHistory } from '@/lib/complianceHelper';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { userId } = req.query;
    const { startDate, endDate, medicationId } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate 
      ? new Date(startDate) 
      : new Date(end.getTime() - (7 * 24 * 60 * 60 * 1000));

    const compliance = await calculateCompliance(userId, start, end);
    const history = await getMedicationHistory(userId, start, end);

    // Filter by specific medication if requested
    const filteredHistory = medicationId
      ? history.filter(h => h.medicationId.toString() === medicationId)
      : history;

    res.status(200).json({
      success: true,
      data: {
        overall: compliance,
        byMedication: filteredHistory
      }
    });
  } catch (error) {
    console.error('Compliance endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
}