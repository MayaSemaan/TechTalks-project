import { NextResponse } from "next/server";
import resend from "../../../utils/resend"; // your Resend init

export async function POST(req) {
  try {
    const { to } = await req.json(); // read 'to' instead of 'email'

    const response = await resend.emails.send({
      from: "sandbox@resend.dev",
      to, // must be 'to'
      subject: "Welcome to TechTalks!",
      html: "<p>Your account was created successfully.</p>",
    });

    return NextResponse.json({ success: true, response });
  } catch (err) {
    return NextResponse.json({ success: false, error: err });
  }
}
