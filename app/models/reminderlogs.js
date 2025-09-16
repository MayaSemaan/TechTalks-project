// app/models/reminderLog.js
import mongoose from "mongoose";

const reminderLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    medicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medication",
      required: true,
    },
    timestamp: { type: Date, required: true },
    status: { type: String, required: true }, // e.g., "taken" or "missed"
    reminderType: { type: String, required: true }, // e.g., "app" or "email"
  },
  { timestamps: true }
);

const ReminderLog =
  mongoose.models.ReminderLog ||
  mongoose.model("ReminderLog", reminderLogSchema);
export default ReminderLog;
