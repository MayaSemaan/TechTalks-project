import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET() {
  await connectToDatabase();
  const users = await User.find();
  return Response.json(users);
}

export async function POST(req) {
  await connectToDatabase();
  try {
    const body = await req.json();
    const user = await User.create(body);
    return Response.json(user, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
