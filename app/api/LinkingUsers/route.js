import { authMiddleware } from "@/middlewares/auth";
import User from "@/models/User";
import { connectToDB } from "@/lib/db";

await connectToDB(); 

export async function POST(req) {
  try {
    const user = await authMiddleware(req); 

    const { targetId, role } = await req.json();

    // Validate role
    if (!["doctor", "family"].includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), { status: 400 });
    }

    // Find the target user
    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      return new Response(JSON.stringify({ error: "Target user not found" }), { status: 404 });
    }

    // Ensure the role matches the target user
    if (targetUser.role !== role) {
      return new Response(JSON.stringify({ error: "Target user's role does not match" }), { status: 400 });
    }

    // Link doctor
    if (role === "doctor") {
      if (!user.linkedDoctor.includes(targetId)) {
        user.linkedDoctor.push(targetId);
      }
      if (!targetUser.patient.includes(user._id)) {
        targetUser.patient.push(user._id);
      }
    }

    // Link family
    if (role === "family") {
      if (!user.linkedFamily.includes(targetId)) {
        user.linkedFamily.push(targetId);
      }
      if (!targetUser.patient.includes(user._id)) {
        targetUser.patient.push(user._id);
      }
    }

    await user.save();
    await targetUser.save();

    return new Response(JSON.stringify({ message: `${role} linked successfully` }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Unauthorized" }), { status: 401 });
  }
}
