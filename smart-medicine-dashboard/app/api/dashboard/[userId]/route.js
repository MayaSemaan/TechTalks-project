// app/api/dashboard/[userId]/route.js


import dbConnect from "@/lib/dbConnect";
import ReminderLog from "@/models/reminderlog";
import Medication from "@/models/medication";
import Report from "@/models/report";
import mongoose from "mongoose";

export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const { userId } = params;
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'week';

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return Response.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const objectId = new mongoose.Types.ObjectId(userId);
    
    // Get all medications for this user
    const userMedications = await Medication.find({ userId: objectId });
    const medicationIds = userMedications.map(med => med._id);
    
    // Basic statistics
    const totalMeds = userMedications.length;
    
    // Get all reminder logs for user's medications
    const allLogs = await ReminderLog.find({ 
      medicationId: { $in: medicationIds } 
    });
    
    const totalLogs = allLogs.length;
    const takenLogs = allLogs.filter(log => log.status === "taken").length;
    const missedLogs = totalLogs - takenLogs;
    const compliance = totalLogs > 0 ? ((takenLogs / totalLogs) * 100).toFixed(2) : "0.00";
    
    // Get doctor reports count
    const reportCount = await Report.countDocuments({ patientId: objectId });

    // Calculate date range based on filter
    const now = new Date();
    let startDate = new Date();
    let groupFormat = '%Y-%m-%d';
    
    switch(filter) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        groupFormat = '%Y-%m-%d';
        break;
      case 'month':
        startDate.setDate(now.getDate() - 30);
        groupFormat = '%Y-%m-%d';
        break;
      case 'year':
        startDate.setMonth(now.getMonth() - 12);
        groupFormat = '%Y-%m';
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Aggregate trend data from reminder logs
    const trendAggregation = await ReminderLog.aggregate([
      {
        $match: {
          medicationId: { $in: medicationIds },
          timestamp: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: groupFormat, date: "$timestamp" } },
            status: "$status"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]);

    // Format trend data for frontend charts
    const trendMap = {};
    trendAggregation.forEach(item => {
      const date = item._id.date;
      if (!trendMap[date]) {
        trendMap[date] = { date, taken: 0, missed: 0 };
      }
      trendMap[date][item._id.status] = item.count;
    });

    const trendData = Object.values(trendMap);

    // Get doctor reports with full details
    const reports = await Report.find({ patientId: objectId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title description fileUrl createdAt')
      .lean();

    // Format reports for frontend
    const formattedReports = reports.map(report => ({
      _id: report._id.toString(),
      title: report.title,
      description: report.description,
      fileUrl: report.fileUrl,
      createdAt: report.createdAt
    }));

    return Response.json({
      success: true,
      totalMeds,
      compliance,
      missedLogs,
      reportCount,
      trendData,
      reports: formattedReports
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return Response.json({ 
      success: false,
      error: "Failed to load dashboard data",
      message: error.message 
    }, { status: 500 });
  }
}