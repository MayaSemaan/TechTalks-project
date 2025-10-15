import bcrypt from "bcryptjs";
import { connectToDB } from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";

export async function POST(req) {
  try {
    await connectToDB();

    const { email, password } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ msg: "Missing fields" }), {
        status: 400,
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return new Response(JSON.stringify({ msg: "User not found" }), {
        status: 404,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return new Response(JSON.stringify({ msg: "Incorrect password" }), {
        status: 401,
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return new Response(JSON.stringify({ msg: "Login successful", token }), {
      status: 200,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ msg: "Server error", error: err.message }),
      { status: 500 }
    );
  }
}
