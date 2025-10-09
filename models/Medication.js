import mongoose from "mongoose";

const DoseSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    taken: { type: Boolean, default: null }, // ✅ default null
    time: { type: String, required: true }, // HH:MM string
  },
  { _id: false }
);

const CustomIntervalSchema = new mongoose.Schema(
  {
    number: { type: Number, default: 1 },
    unit: { type: String, enum: ["day", "week", "month"], default: "day" },
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
    type: {
      type: String,
      enum: ["tablet", "capsule", "syrup", "injection"],
      default: "tablet",
    },
    schedule: {
      type: String,
      enum: ["daily", "weekly", "monthly", "custom"],
      default: "daily",
      required: true,
    },
    customInterval: { type: CustomIntervalSchema, required: false },
    times: [{ type: String, required: true }],
    status: {
      type: String,
      enum: ["pending", "taken", "missed"],
      default: "pending",
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    reminders: { type: Boolean, default: false },
    notes: { type: String, default: "" },
    doses: [DoseSchema],
    notifiedTimes: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.Medication ||
  mongoose.model("Medication", MedicationSchema);
