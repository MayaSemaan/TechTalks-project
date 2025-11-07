import { resend } from "./resend.js";

export async function sendNotification(
  to,
  subject = "Notification",
  html = "<p>You have a new notification</p>"
) {
  try {
    const response = await resend.emails.send({
      from: "sandbox@resend.dev",
      to,
      subject,
      html,
    });
    return response;
  } catch (err) {
    console.error("Failed to send notification:", err);
    throw err;
  }
}
