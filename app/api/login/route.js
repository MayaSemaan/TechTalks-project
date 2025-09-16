import { NextResponse } from "next/server";
import connectDB from "../../../utils/dbConnect";
import User from "../../models/user";

await connectDB(); // Ensure DB is connected

export async function POST(req) {
  try {
    const { email, password } = await req.json(); // call as function

    const user = await User.findOne({ email, password });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { message: "Login successful", user },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
