import { connectToDB } from "@/lib/db";
import { authMiddleware } from "@/middlewares/auth";
import User from "@/models/User";

export async function DELETE(_, { params }) {
  await connectToDB();
  try {
    const user = await User.findOneAndDelete({ _id: params.id });
    if (!user) return Response.json({ message: "User not found" }, { status: 404 });
    return Response.json({ message: "User deleted and medications removed" });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
