import { NextResponse } from "next/server";
import connectToDB from "../../../lib/db.js";
import User from "../../../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req) {
  try {
    await connectToDB();
    const { name, email, password, role } = await req.json();

    const existing = await User.findOne({ email });
    if (existing)
      return NextResponse.json({ error: "User exists" }, { status: 400 });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    return NextResponse.json({ user, token }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
