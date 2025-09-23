import { Resend } from "resend";

const resend = new Resend(process.env.SENDER_API_KEY);

export default resend;
