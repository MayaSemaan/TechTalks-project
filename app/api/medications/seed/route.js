import dbConnect from "../../../../lib/dbConnect";
import mongoose from "mongoose";
import Medication from "../../../../lib/models/Medication";
import User from "../../../../lib/models/User";

const MOCK_USER_ID = "68cb6d0e4bde3de93475ba69"; // make sure this user exists

export async function POST(req) {
  await dbConnect();

  try {
    const med = await Medication.create({
      userId: new mongoose.Types.ObjectId(MOCK_USER_ID),
      name: "Test Medication",
      dosage: "1 pill",
      schedule: "08:00, 20:00", // string instead of array
    });

    return new Response(
      JSON.stringify({ message: "Cron executed", count: 1 }),
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({
        error: "Failed to insert seed data",
        details: err.message,
      }),
      { status: 500 }
    );
  }
}
