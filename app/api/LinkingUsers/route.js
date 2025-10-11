import { authenticate } from "../../../middlewares/auth.js";
import User from "../../../models/User.js";
import connectToDB from "../../../lib/db.js";

export async function POST(req) {
  try {
    await connectToDB();

    const user = await authenticate(req);
    const { targetId, role } = await req.json();

    if (!["doctor", "family"].includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400,
      });
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      return new Response(JSON.stringify({ error: "Target user not found" }), {
        status: 404,
      });
    }

    if (targetUser.role !== role) {
      return new Response(
        JSON.stringify({ error: "Target user's role does not match" }),
        { status: 400 }
      );
    }

    // === LINKING LOGIC ===

    // ✅ If target is a DOCTOR
    if (role === "doctor") {
      // Patient links doctor
      if (!user.linkedDoctors.includes(targetId)) {
        user.linkedDoctors.push(targetId);
      }

      // Doctor links patient
      if (!targetUser.patients.includes(user._id)) {
        targetUser.patients.push(user._id);
      }
    }

    // ✅ If target is a FAMILY member
    if (role === "family") {
      // Patient links family
      if (!user.linkedFamily.includes(targetId)) {
        user.linkedFamily.push(targetId);
      }

      // Family links patient
      if (!targetUser.linkedPatients.includes(user._id)) {
        targetUser.linkedPatients.push(user._id);
      }
    }

    await user.save();
    await targetUser.save();

    return new Response(
      JSON.stringify({ message: `${role} linked successfully` }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Error linking user:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Server error" }),
      { status: 500 }
    );
  }
}
