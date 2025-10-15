import { connectToDB } from "@/lib/db";
import Medication from "@/models/Medication";

export async function GET(_, { params }) {
  await connectToDB();
  const med = await Medication.findById(params.id).populate("userId", "name email");
  if (!med) return Response.json({ message: "Not found" }, { status: 404 });
  return Response.json(med);
}

export async function PUT(req, { params }) {
  await connectToDB();
  try {
    const body = await req.json();
    const med = await Medication.findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
    return med ? Response.json(med) : Response.json({ message: "Not found" }, { status: 404 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(_, { params }) {
 await connectToDB();
  const med = await Medication.findByIdAndDelete(params.id);
  return med ? Response.json({ message: "Medication deleted" }) : Response.json({ message: "Not found" }, { status: 404 });
}
