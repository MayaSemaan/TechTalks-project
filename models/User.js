import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["patient", "family", "doctor"] }
});

UserSchema.pre("findOneAndDelete", async function(next) {
  const userId = this.getQuery()["_id"];
  await mongoose.model("Medication").deleteMany({ userId });
  next();
});

export default mongoose.models.User || mongoose.model("User", UserSchema);
