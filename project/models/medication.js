import mongoose from "mongoose";

const MedicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: String,
  dosage: String,
  schedule: String,
  status: { type: String, enum: ["taken", "missed", "pending"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Medication || mongoose.model("Medication", MedicationSchema);