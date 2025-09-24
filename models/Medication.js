import mongoose from "mongoose";

const DoseSchema = new mongoose.Schema(
  {
    date: Date,
    taken: Boolean,
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
    dosage: { type: String, required: true },
    schedule: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "taken", "missed"],
      default: "pending",
    },
    doses: [DoseSchema], // optional dose tracking from fetchingData branch
  },
  { timestamps: true }
);

const Medication =
  mongoose.models.Medication || mongoose.model("Medication", MedicationSchema);

export default Medication;
