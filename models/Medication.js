import mongoose from "mongoose";

const DoseSchema = new mongoose.Schema(
  { date: Date, taken: Boolean },
  { _id: false }
);

const MedicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    dosage: { type: String, required: true },
    schedule: { type: String, required: true }, // e.g., "08:00,20:00"
    status: {
      type: String,
      enum: ["pending", "taken", "missed"],
      default: "pending",
    },
    doses: [DoseSchema],
    notifiedTimes: { type: [String], default: [] }, // track which times notifications have been sent
  },
  { timestamps: true }
);

export default mongoose.models.Medication ||
  mongoose.model("Medication", MedicationSchema);
