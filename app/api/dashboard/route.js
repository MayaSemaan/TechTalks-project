import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Medication from "@/models/Medication";
import User from "@/models/User";

export async function GET(request) {
  try {
    await connectToDB();

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status"); 
    const fromDate = searchParams.get("fromDate");   
    const toDate = searchParams.get("toDate");       

    // Validate userId
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build query for medications
    const query = { userId };
    if (status) query.status = status;
    if (fromDate && toDate) {
      query.createdAt = { $gte: new Date(fromDate), $lte: new Date(toDate) };
    }

    // Fetch medications
    const meds = await Medication.find(query).lean();

    // Calculate compliance
    const total = meds.length;
    const takenCount = meds.filter(m => m.status === "taken").length;
    const compliance = total ? ((takenCount / total) * 100).toFixed(2) : 0;

    // Send response
    return NextResponse.json({
      success: true,
      totalMeds: total,
      compliance,
      medications: meds,
    });
  } catch (error) {
    console.error("Dashboard filter error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
