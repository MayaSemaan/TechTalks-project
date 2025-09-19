import mongoose from "mongoose";

const MedicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  schedule: { type: String, required: true }, // now a string like "08:00, 20:00"
  status: { type: String, enum: ["pending", "taken"], default: "pending" },
});

export default mongoose.models.Medication ||
  mongoose.model("Medication", MedicationSchema);
