import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const { to, subject, html } = await req.json();

    // Send the email
    const data = await resend.emails.send({
      from: "sandbox@resend.dev",
      to,
      subject,
      html,
    });

    return new Response(
      JSON.stringify({ message: "Email sent successfully!", data }),
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
