// utils/resend.js
import { Resend } from "resend";

// Make sure you have RESEND_API_KEY in your .env
export const resend = new Resend(process.env.RESEND_API_KEY);
