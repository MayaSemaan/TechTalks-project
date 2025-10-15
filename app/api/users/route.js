import { connectToDB } from "@/lib/db";
import { authMiddleware } from "@/middlewares/auth";
import User from "@/models/User";

export async function GET() {
  await connectToDB();
  const users = await User.find();
  return Response.json(users);
}

export async function POST(req) {
  await connectToDB();
  try {
    const body = await req.json();
    const user = await User.create(body);
    return Response.json(user, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
