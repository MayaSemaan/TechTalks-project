// app/api/dashboard/[userId]/reports/route.js
import connectToDB from "../../../../../lib/db.js";
import Report from "../../../../../models/Report.js";
import User from "../../../../../models/User.js";
import { calculateCompliance } from "../../../../../lib/complianceHelper.js";

export async function GET(req, { params }) {
  try {
    await connectToDB();

    const url = new URL(req.url);
    const userId = params.userId;
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const includeCompliance =
      url.searchParams.get("includeCompliance") !== "false";

    const user = await User.findById(userId);
    if (!user)
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
      });

    let reports;
    if (user.role === "doctor") {
      reports = await Report.find({ doctor: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("patient", "name email");
    } else if (user.role === "patient") {
      reports = await Report.find({ patient: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("doctor", "name email specialization");
    } else {
      return new Response(JSON.stringify({ error: "Unauthorized role" }), {
        status: 403,
      });
    }

    if (includeCompliance && user.role === "doctor") {
      reports = await Promise.all(
        reports.map(async (report) => {
          const reportObj = report.toObject();
          const patientCompliance = await calculateCompliance(
            report.patient._id,
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            new Date()
          );
          return {
            ...reportObj,
            patientCompliance: patientCompliance.compliancePercentage,
          };
        })
      );
    }

    const formattedReports = reports.map((report) => ({
      reportId: report._id,
      title: report.title,
      description: report.description,
      fileUrl: report.fileUrl,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      ...(user.role === "doctor" && {
        patientName: report.patient?.name,
        patientEmail: report.patient?.email,
        patientCompliance: report.patientCompliance,
      }),
      ...(user.role === "patient" && {
        doctorName: report.doctor?.name,
        doctorSpecialization: report.doctor?.specialization,
      }),
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: { reports: formattedReports, totalReports: reports.length },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Reports dashboard error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
