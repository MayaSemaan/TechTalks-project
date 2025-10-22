import connectToDB from "../../../../lib/db.js";
import User from "../../../../models/User.js";

export async function GET(req) {
  try {
    await connectToDB();

    const url = new URL(req.url);
    const email = url.searchParams.get("email");
    if (!email)
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
      });

    const patient = await User.findOne({ email, role: "patient" }).select(
      "_id name email"
    );
    if (!patient)
      return new Response(JSON.stringify({ error: "Patient not found" }), {
        status: 404,
      });

    return new Response(JSON.stringify(patient), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
    });
  }
}
