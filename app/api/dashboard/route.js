import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Medication from "@/models/Medication";
import User from "@/models/User";

// GET medications
export async function GET(request) {
  try {
    await connectToDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const query = { userId };
    if (status) query.status = status;
    if (fromDate && toDate) {
      query.createdAt = { $gte: new Date(fromDate), $lte: new Date(toDate) };
    }

    const meds = await Medication.find(query).lean();
    const total = meds.length;
    const takenCount = meds.filter(m => m.status === "taken").length;
    const compliance = total ? ((takenCount / total) * 100).toFixed(2) : 0;

    return NextResponse.json({
      success: true,
      totalMeds: total,
      compliance,
      medications: meds,
    });
  } catch (error) {
    console.error("Dashboard GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST new medication
export async function POST(request) {
  try {
    await connectToDB();

    const body = await request.json();

    const { userId, name, dosage, schedule, status } = body;

    if (!userId || !name || !status) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Create new medication
    const newMed = await Medication.create({
      userId,
      name,
      dosage: dosage || "",
      schedule: schedule || "",
      status,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, medication: newMed });
  } catch (error) {
    console.error("Dashboard POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to add medication" }, { status: 500 });
  }
}
