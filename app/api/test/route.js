import { connectToDB } from "@/lib/db";

export async function GET() {
  try {
    await connectToDB();
    return Response.json({ message: "MongoDB Connected" });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Database connection failed" }, { status: 500 });
  }
}
