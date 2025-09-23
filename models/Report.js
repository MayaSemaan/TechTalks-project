// models/Report.js
import mongoose from "mongoose"; // Make sure this is at the top
import User from "./User.js"; // Import User to ensure it's registered

const ReportSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId, // Use mongoose.Schema.Types.ObjectId
      ref: "User",
      required: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    fileUrl: { type: String }, // optional for now
  },
  { timestamps: true }
);

// Ensure model is registered only once
export default mongoose.models.Report || mongoose.model("Report", ReportSchema);
