import { NextResponse } from "next/server";
import connectToDB from "../../../lib/db.js";
import User from "../../../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req) {
  try {
    await connectToDB();
    const { email, password } = await req.json();

    const user = await User.findOne({ email });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    // ✅ Return role explicitly
    return NextResponse.json({ user, token }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
