import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/medicine_reminder";

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable in .env.local");
}

if (!global._mongoose) {
  global._mongoose = mongoose.connect(MONGODB_URI, {
  });
}

export default global._mongoose;
