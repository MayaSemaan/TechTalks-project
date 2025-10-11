import mongoose from "mongoose";
import "./User.js";

function validateSchedule(v) {
  const regex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;
  return regex.test(v);
}

const MedicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    validate: {
      validator: async function(value) {
        const User = mongoose.model("User");
        return await User.exists({ _id: value });
      },
      message: "Invalid User ID"
    }
  },
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  schedule: { type: String, required: true, validate: [validateSchedule, "Use HH:MM AM/PM"] },
  status: { type: String, enum: ["taken", "missed"], default: "taken" }
}, { timestamps: true });

MedicationSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.models.Medication || mongoose.model("Medication", MedicationSchema);
