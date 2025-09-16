// app/models/medication.js
import mongoose from "mongoose";

const medicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    dosage: { type: String, required: true },
    schedule: [{ type: String }], // ISO timestamps as strings
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // link to patient
  },
  { timestamps: true }
);

const Medication =
  mongoose.models.Medication || mongoose.model("Medication", medicationSchema);
export default Medication;
