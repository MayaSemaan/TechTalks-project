import { NextResponse } from "next/server";
import connectToDB from "../../../../../../lib/db.js";
import Report from "../../../../../../models/Report.js";
import fs from "fs";
import path from "path";

export async function GET(req, { params }) {
  try {
    await connectToDB();
    const { reportId } = params;

    const report = await Report.findById(reportId);
    if (!report || !report.fileUrl) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Serve file for download
    const filePath = path.join(process.cwd(), "public", report.fileUrl);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileStream = fs.createReadStream(filePath);

    return new Response(fileStream, {
      headers: {
        "Content-Disposition": `attachment; filename=${path.basename(
          filePath
        )}`,
        "Content-Type": "application/pdf",
      },
    });
  } catch (err) {
    console.error("GET /api/reports/view/[reportId]/download error:", err);
    return NextResponse.json(
      { error: "Failed to download report" },
      { status: 500 }
    );
  }
}
