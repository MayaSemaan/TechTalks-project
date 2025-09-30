import mongoose from "mongoose";

// Dose schema
const DoseSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    taken: { type: Boolean, default: false },
  },
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
    dosage: { type: Number, required: true },
    unit: {
      type: String,
      enum: ["mg", "ml", "pills", "capsules", "drops"],
      default: "mg",
    },
    times: [{ type: String, required: true }],
    status: {
      type: String,
      enum: ["pending", "taken", "missed"],
      default: "pending",
    },
    doses: [DoseSchema],
    notifiedTimes: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.Medication ||
  mongoose.model("Medication", MedicationSchema);
