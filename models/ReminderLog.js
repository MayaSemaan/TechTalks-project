import mongoose from "mongoose";

const ReminderLogSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ["taken", "missed", "pending"],
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.ReminderLog ||
  mongoose.model("ReminderLog", ReminderLogSchema);
