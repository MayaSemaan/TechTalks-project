import mongoose from "mongoose";
import Report from "../app/models/reports.js"; // adjust path if needed

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/smart-medicine");

async function cleanup() {
  try {
    const result = await Report.deleteMany({
      $or: [{ doctor: null }, { patient: null }],
    });
    console.log("Deleted reports:", result.deletedCount);
  } catch (error) {
    console.error("Error deleting reports:", error);
  } finally {
    mongoose.connection.close();
  }
}

cleanup();
