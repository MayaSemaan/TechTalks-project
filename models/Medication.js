import mongoose from "mongoose";

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
    status: { type: String, enum: ["taken", "missed"], default: "missed" },
  },
  { timestamps: true }
);

const Medication =
  mongoose.models.Medication || mongoose.model("Medication", MedicationSchema);
export default Medication;
