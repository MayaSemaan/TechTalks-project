
// pages/api/dashboard/[userId].js

import dbConnect from "@/lib/dbConnect";
import Medication from "@/models/medication";
import Report from "@/models/report";
import mongoose  from "mongoose";

export default async function handler(req, res) {
  await dbConnect();
  const { userId } = req.query;

  if (req.method === "GET") {
    try {
      const ObjectId=new mongoose.Types.ObjectId(userId);

      const medications = await Medication.find({ userId: ObjectId });
      const reports = await Report.find({ patientId: ObjectId });

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
