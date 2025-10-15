import { NextResponse } from "next/server";
import connectToDB from "../../../lib/db.js";
import User from "../../../models/User.js";
import { authenticate } from "../../../middlewares/auth.js";

export async function GET(req) {
  try {
    await connectToDB();

    // ✅ Get current logged-in user (doctor/family)
    const user = await authenticate(req);

    let patients = [];

    if (user.role === "doctor") {
      // Fetch patients linked to this doctor
      patients = await User.find({ _id: { $in: user.patients } }).select(
        "name email"
      );
    } else if (user.role === "family") {
      // Fetch patients linked to this family member
      patients = await User.find({ _id: { $in: user.linkedPatients } }).select(
        "name email"
      );
    } else if (user.role === "patient") {
      // Just return themselves
      patients = [user];
    }

    return NextResponse.json(patients);
  } catch (err) {
    console.error("GET /api/patients error:", err);
    return NextResponse.json(
      { error: "Failed to fetch patients" },
      { status: 500 }
    );
  }
}
