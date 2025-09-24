import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fileUrl: { type: String }, // added from fetchingData branch
  },
  { timestamps: true }
);

const Report = mongoose.models.Report || mongoose.model("Report", reportSchema);

export default Report;
