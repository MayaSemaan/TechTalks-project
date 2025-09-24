import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db.js";
import Medication from "../../../models/Medication.js";

export async function GET(req) {
  try {
    await dbConnect();
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId)
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const medications = await Medication.find({ userId });
    return NextResponse.json(medications);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const data = await req.json();
    const medication = await Medication.create(data);
    return NextResponse.json(medication);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
