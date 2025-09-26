import mongoose from "mongoose";

// Track each dose event
const DoseSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true }, // when dose was scheduled/taken
    taken: { type: Boolean, default: false }, // marked true if user confirmed
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
    name: { type: String, required: true }, // e.g. "Paracetamol"
    dosage: { type: Number, required: true }, // numeric value
    unit: {
      type: String,
      enum: ["mg", "ml", "pills", "capsules", "drops"],
      default: "mg",
    },
    times: [{ type: String, required: true }], // e.g. ["08:00", "20:00"]
    status: {
      type: String,
      enum: ["pending", "taken", "missed"],
      default: "pending",
    },
    doses: [DoseSchema], // log of doses
    notifiedTimes: [{ type: String }], // keep track of which times reminders were sent
  },
  { timestamps: true }
);

export default mongoose.models.Medication ||
  mongoose.model("Medication", MedicationSchema);
