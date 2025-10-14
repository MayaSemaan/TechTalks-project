import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

// ----- Dose Subschema -----
const DoseSchema = new mongoose.Schema(
  {
    doseId: { type: String, default: () => uuidv4(), required: true },
    date: {
      type: Date,
      required: true,
      validate: {
        validator: (v) => !isNaN(new Date(v).getTime()),
        message: "Invalid dose date",
      },
    },
    taken: { type: Boolean, default: null }, // null = pending
    time: {
      type: String,
      required: true,
      match: [/^([0-1]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)"],
    },
  },
  { _id: false }
);

// ----- Custom Interval Subschema -----
const CustomIntervalSchema = new mongoose.Schema(
  {
    number: { type: Number, default: 1, min: 1 },
    unit: { type: String, enum: ["day", "week", "month"], default: "day" },
  },
  { _id: false }
);

// ----- Main Medication Schema -----
const MedicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      validate: {
        validator: (v) => mongoose.Types.ObjectId.isValid(v),
        message: "Invalid userId",
      },
    },
    name: {
      type: String,
      required: [true, "Medication name is required"],
      trim: true,
    },
    dosage: {
      type: Number,
      required: [true, "Dosage is required"],
      min: [0.1, "Dosage must be greater than 0"],
    },
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
      required: true,
    },
    customInterval: { type: CustomIntervalSchema },
    times: {
      type: [String],
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.length > 0 &&
          arr.every((t) => /^([0-1]\d|2[0-3]):([0-5]\d)$/.test(t)),
        message: "Each time must be in HH:MM format and non-empty",
      },
      required: [true, "At least one time is required"],
    },
    status: {
      type: String,
      enum: ["pending", "taken", "missed"],
      default: "pending",
    },
    startDate: { type: Date, default: null },

    // ✅ Fixed validator (runs only if date fields are modified)
    endDate: {
      type: Date,
      default: null,
      validate: {
        validator: function (v) {
          if (!this.isModified("endDate") && !this.isModified("startDate"))
            return true;
          return (
            !v ||
            !this.startDate ||
            new Date(v).setHours(0, 0, 0, 0) >=
              new Date(this.startDate).setHours(0, 0, 0, 0)
          );
        },
        message: "endDate must be after startDate",
      },
    },

    reminders: { type: Boolean, default: false },
    notes: { type: String, default: "" },
    doses: { type: [DoseSchema], default: [] },
    notifiedTimes: { type: [String], default: [] },
  },
  { timestamps: true }
);

// ----- Auto-clean doses -----
MedicationSchema.pre("save", function (next) {
  if (Array.isArray(this.doses)) {
    this.doses = this.doses.filter(
      (d) =>
        d.time &&
        /^([0-1]\d|2[0-3]):([0-5]\d)$/.test(d.time) &&
        d.date instanceof Date
    );

    const uniqueTimes = new Set();
    this.doses = this.doses.filter((d) => {
      if (uniqueTimes.has(d.time)) return false;
      uniqueTimes.add(d.time);
      return true;
    });
  }
  next();
});

export default mongoose.models.Medication ||
  mongoose.model("Medication", MedicationSchema);
