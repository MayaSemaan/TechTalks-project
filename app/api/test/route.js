import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  await connectToDatabase();
  return Response.json({ message: " MongoDB Connected" });
}
