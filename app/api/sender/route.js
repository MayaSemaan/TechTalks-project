// app/api/sender/route.js
import { NextResponse } from "next/server";
import { sendNotification } from "../../utils/sendNotification.js";

export async function POST(req) {
  try {
    const { to, subject, html } = await req.json();

    const response = await sendNotification(to, subject, html);

    return NextResponse.json({ success: true, response });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
