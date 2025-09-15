import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const data = await req.json();
    const emailTo = data.to; // email address to send

    const response = await resend.emails.send({
      from: "sandbox@resend.dev", // your sandbox sender
      to: emailTo,
      subject: "Test Email from Sandbox",
      html: "<h1>Hello!</h1><p>This is a test email in sandbox mode.</p>",
    });

    return new Response(
      JSON.stringify({ message: "Email sent successfully!", data: response }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ message: "Failed to send email", error: error.message }),
      { status: 500 }
    );
  }
}
