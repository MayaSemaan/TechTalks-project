import { authenticate } from "../../../middlewares/auth.js";
import User from "../../../models/User.js";
import connectToDB from "../../../lib/db.js";

export async function POST(req) {
  try {
    await connectToDB();

    // ✅ Authenticate logged-in user (from token)
    const user = await authenticate(req);
    const { targetId, role } = await req.json();

    if (!targetId || !role) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
      });
    }

    // ✅ Validate that the target user exists
    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      return new Response(JSON.stringify({ error: "Target user not found" }), {
        status: 404,
      });
    }

    // === ✅ Role validation logic ===
    // Doctors can link to patients
    // Family can link to patients
    // Patients cannot link anyone
    const validLinks = {
      doctor: ["patient"],
      family: ["patient"],
      patient: [],
    };

    if (!validLinks[user.role]?.includes(role)) {
      return new Response(
        JSON.stringify({
          error: `Invalid role combination: ${user.role} cannot link to ${role}`,
        }),
        { status: 400 }
      );
    }

    // === ✅ Verify the target actually has that role ===
    if (targetUser.role !== role) {
      return new Response(
        JSON.stringify({
          error: `Target user is not a ${role}, found ${targetUser.role}`,
        }),
        { status: 400 }
      );
    }

    // === ✅ Linking logic ===

    // Doctor → Patient
    if (user.role === "doctor" && role === "patient") {
      if (!user.patients.includes(targetId)) user.patients.push(targetId);
      if (!targetUser.linkedDoctors.includes(user._id))
        targetUser.linkedDoctors.push(user._id);
    }

    // Family → Patient
    if (user.role === "family" && role === "patient") {
      if (!user.linkedPatients.includes(targetId))
        user.linkedPatients.push(targetId);
      if (!targetUser.linkedFamily.includes(user._id))
        targetUser.linkedFamily.push(user._id);
    }

    await user.save();
    await targetUser.save();

    return new Response(
      JSON.stringify({
        message: `${role} linked successfully`,
        from: user.role,
        to: targetUser.role,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error linking user:", err);
    return new Response(
      JSON.stringify({
        error: err.message || "Server error",
      }),
      { status: 500 }
    );
  }
}
