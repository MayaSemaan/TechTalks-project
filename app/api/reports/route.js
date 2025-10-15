import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

// Keep reports in memory (will include uploaded ones)
let reports = [];

export async function POST(req) {
  try {
    const data = await req.formData();
    const file = data.get("file");
    const title = data.get("title");

    if (!file || !title) {
      return NextResponse.json(
        { success: false, error: "Missing file or title" },
        { status: 400 }
      );
    }

    // Save file in public folder
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = path.join(process.cwd(), "public", fileName);
    await writeFile(filePath, buffer);

    // Create new report entry
    const newReport = {
      _id: Date.now(),
      title,
      fileUrl: `/${fileName}`,
    };

    // Add uploaded report to the list
    reports.push(newReport);

    return NextResponse.json({ success: true, report: newReport });
  } catch (err) {
    console.error("Error uploading report:", err);
    return NextResponse.json(
      { success: false, error: "Failed to upload report" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return the full list of uploaded reports
  return NextResponse.json(reports);
}
