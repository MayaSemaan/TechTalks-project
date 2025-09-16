import dbConnect from "../../../utils/dbConnect";
import User from "../../../smart-medicine/models/user";

export async function POST(req) {
  await dbConnect();
  const data = await req.json();
  const newUser = await User.create(data);
  return new Response(JSON.stringify(newUser), { status: 201 });
}
