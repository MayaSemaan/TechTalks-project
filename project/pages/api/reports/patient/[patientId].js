import dbConnect from "@/lib/dbConnect";
import Report from "@/models/report";

export default async function handler(req, res) {
  await dbConnect();
  const { patientId } = req.query;

  if (req.method === "GET") {
    try {
      const reports = await Report.find({ patientId });
      return res.status(200).json(reports);
    } catch (err) {
      return res.status(500).json({ error: "Failed to fetch reports" });
    }
  }

  res.setHeader("Allow", ["GET"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}