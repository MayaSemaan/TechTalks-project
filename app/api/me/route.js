import { NextResponse } from "next/server";
import connectToDB from "../../../lib/db.js";
import { authenticate } from "../../../middlewares/auth.js";

export async function GET(req) {
  try {
    await connectToDB();
    const user = await authenticate(req);
    return NextResponse.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
