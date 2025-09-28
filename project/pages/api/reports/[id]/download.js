import dbConnect from "@/lib/dbConnect";
import Report from "@/models/report";
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === "GET") {
    try {
      const report = await Report.findById(id);
      if (!report || !report.fileUrl) {
        return res.status(404).json({ error: "Report not found" });
      }

      const filePath = path.resolve(report.fileUrl);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }

      res.setHeader("Content-Disposition",`attachment; filename=${path.basename(filePath)}`);
      res.setHeader("Content-Type", "application/octet-stream");
      fs.createReadStream(filePath).pipe(res);

    } catch (err) {
      return res.status(500).json({ error: "Failed to download report" });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);}}
  