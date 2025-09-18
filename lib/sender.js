import axios from "axios";

export async function sendEmail({ to, subject, text }) {
  const API_KEY = process.env.SENDER_API_KEY;
  const FROM_EMAIL = "your-email@example.com"; // replace with verified Sender email

  if (!API_KEY) throw new Error("Sender API key not set");

  await axios.post(
    "https://api.sender.net/v2/email/send",
    {
      to: [{ email: to }],
      from: { email: FROM_EMAIL },
      subject,
      text,
    },
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
}
