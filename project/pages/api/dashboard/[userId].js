import dbConnect from "@/lib/dbConnect";
import Medication from "@/models/medication";
import Report from "@/models/report";

export default async function handler(req, res) {
  await dbConnect();
  const { userId } = req.query;

  if (req.method === "GET") {
    try {
      const medications = await Medication.find({ userId });
      const reports = await Report.find({ patientId: userId });

      return res.status(200).json({
        medications,
        reports
      });
    } catch (err) {
      return res.status(500).json({ error: "Failed to load dashboard data" });
    }
  }

  res.setHeader("Allow", ["GET"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}