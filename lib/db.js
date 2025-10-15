import mongoose from "mongoose";

let isConnected = false;

export async function connectToDB() {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect("mongodb://localhost:27017/techtalks", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = !!conn.connections[0].readyState;
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}
