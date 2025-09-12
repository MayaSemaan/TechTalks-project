import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "@/lib/db";
import User from "@/models/User";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

export async function POST(req) {
  try {
    await db;
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ msg: "Missing fields" }), { status: 400 });
    }

    const user = await User.findOne({ email }).lean();
    if (!user) return new Response(JSON.stringify({ msg: "Invalid credentials" }), { status: 400 });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return new Response(JSON.stringify({ msg: "Invalid credentials" }), { status: 400 });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });

    // Return user info + token
    return new Response(JSON.stringify({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ msg: "Server error", error: err.message }), { status: 500 });
  }
}
