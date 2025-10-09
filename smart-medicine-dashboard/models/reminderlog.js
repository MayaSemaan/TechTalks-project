import mongoose from "mongoose";
const ReminderLogSchema = new mongoose.Schema({
  medicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Medication", required: true },
  timestamp: Date,
  status: { type: String, enum: ["taken", "missed"], default: "missed" },
});
export default mongoose.models.ReminderLog || mongoose.model("ReminderLog", ReminderLogSchema);