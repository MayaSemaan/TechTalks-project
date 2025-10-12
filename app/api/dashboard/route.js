import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Medication from "@/models/Medication";
import User from "@/models/User";

// GET medications + compliance stats
export async function GET(request) {
  try {
    await connectToDB();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    if (!userId) return NextResponse.json({ success: false, error: "User ID required" }, { status: 400 });

    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    const query = { userId };
    if (status) query.status = status;
    if (fromDate && toDate) query.createdAt = { $gte: new Date(fromDate), $lte: new Date(toDate) };

    const meds = await Medication.find(query).sort({ createdAt: -1 }).lean();
    const total = meds.length;
    const takenCount = meds.filter((m) => m.status === "taken").length;
    const compliance = total ? ((takenCount / total) * 100).toFixed(2) : 0;

    return NextResponse.json({ success: true, totalMeds: total, compliance, medications: meds });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST add medication
export async function POST(request) {
  try {
    await connectToDB();
    const { userId, name, dosage, schedule, status } = await request.json();

    if (!userId || !name || !status)
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });

    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

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
    console.error("POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to add medication" }, { status: 500 });
  }
}

// PUT update medication
export async function PUT(request) {
  try {
    await connectToDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const body = await request.json();

    if (!id) return NextResponse.json({ success: false, error: "Medication ID required" }, { status: 400 });
    if (body.id) delete body.id;

    const updatedMed = await Medication.findByIdAndUpdate(id, body, { new: true });
    if (!updatedMed) return NextResponse.json({ success: false, error: "Medication not found" }, { status: 404 });

    return NextResponse.json({ success: true, medication: updatedMed });
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json({ success: false, error: "Failed to update medication" }, { status: 500 });
  }
}

// DELETE medication
export async function DELETE(request) {
  try {
    await connectToDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ success: false, error: "Medication ID required" }, { status: 400 });

    const deleted = await Medication.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ success: false, error: "Medication not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Medication deleted successfully" });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete medication" }, { status: 500 });
  }
}
