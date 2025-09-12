import bcrypt from "bcryptjs";
import connectToDB from "@/lib/db";
import User from "../../../models/User";

export async function POST(req) {
  try {
    await connectToDB();
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password) {
      return new Response(JSON.stringify({ msg: "Missing fields" }), {
        status: 400,
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return new Response(JSON.stringify({ msg: "Email already registered" }), {
        status: 400,
      });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashed, role });
    await user.save();

    return new Response(JSON.stringify({ msg: "User registered" }), {
      status: 201,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ msg: "Server error", error: err.message }),
      { status: 500 }
    );
  }
}
