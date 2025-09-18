import dbConnect from "../../../../lib/dbConnect";
import Medication from "../../../../lib/models/Medication";
import User from "../../../../lib/models/User";

import mongoose from "mongoose";

export async function POST(req) {
  await dbConnect();

  try {
    // Check if test user already exists
    const existingUser = await User.findOne({ email: "testuser@example.com" });
    if (existingUser) {
      return new Response(
        JSON.stringify({
          message: "Test user already exists",
          userId: existingUser._id,
        }),
        { status: 200 }
      );
    }

    // Create test user
    const user = await User.create({
      name: "Test User",
      email: "testuser@example.com",
      password: "test1234", // in real app hash passwords
    });

    return new Response(
      JSON.stringify({ message: "Test user created", userId: user._id }),
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({
        error: "Failed to create test user",
        details: err.message,
      }),
      { status: 500 }
    );
  }
}
