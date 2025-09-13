import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in .env.local");
}

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Connection error:", error);
    process.exit(1);
  }
}

main();
