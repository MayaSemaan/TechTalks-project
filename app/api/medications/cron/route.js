import dbConnect from "../../../../lib/dbConnect";
import mongoose from "mongoose";
import Medication from "../../../../lib/models/Medication";
import { sendEmail } from "../../../../lib/sender";

const MOCK_USER_ID = "68cb6d0e4bde3de93475ba69"; // make sure this user exists

export async function POST(req) {
  await dbConnect();

  try {
    // Check if the medication already exists
    const existing = await Medication.findOne({
      userId: MOCK_USER_ID,
      name: "Test Medication",
    });

    let count = 0;

    if (!existing) {
      await Medication.create({
        userId: new mongoose.Types.ObjectId(MOCK_USER_ID),
        name: "Test Medication",
        dosage: "1 pill",
        schedule: "08:00, 20:00",
        status: "pending",
      });

      count = 1;

      // Send email notification (optional)
      try {
        await sendEmail({
          to: "user@example.com", // replace with real email
          subject: "New Medication Added",
          text: "A new test medication was added to your schedule.",
        });
      } catch (emailErr) {
        console.error("Failed to send email:", emailErr.message);
      }
    }

    return new Response(JSON.stringify({ message: "Cron executed", count }), {
      status: 200,
    });
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
