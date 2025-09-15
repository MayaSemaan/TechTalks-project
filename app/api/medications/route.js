import connectToDB from "@/lib/db";
import Medication from "@/models/Medication";
import { authMiddleware } from "@/middlewares/auth";

export async function GET(req){
  try{
    await connectToDB();
    const user = await authMiddleware(req);
    const meds = await Medication.find({ userId: user._id });
    return new Response(JSON.stringify(meds), { status: 200 });
  } catch(err) {
    return new Response(JSON.stringify({ message: "Server error", error: err.message }), { status: 500 });
  }
}

export async function POST(req){
  try{
    await connectToDB();
    const user = await authMiddleware(req);
    const { name, dosage, schedule } = await req.json();

    if(!name || !dosage || !schedule){
      return new Response(JSON.stringify({ message:"Missing fields" }), { status: 400 });
    }

    const med = new Medication({
      userId: user._id,
      name,
      dosage,
      schedule,
      status: "pending"
    });

    await med.save();
    return new Response(JSON.stringify(med), { status: 201 });
  } catch(err){
    return new Response(JSON.stringify({ message:"Server error", error: err.message }), { status: 500 });
  }
}

export async function PUT(req){
  try{
    await connectToDB();
    const user = await authMiddleware(req);
    const { id, ...updateData } = await req.json();

    const med = await Medication.findOneAndUpdate(
      { _id: id, userId: user._id },
      updateData,
      { new: true }
    );

    if(!med) return new Response(JSON.stringify({ message:"Medication not found" }), { status: 404 });
    return new Response(JSON.stringify(med), { status: 200 });

  } catch(err){
    return new Response(JSON.stringify({ message:"Server error", error: err.message }), { status: 500 });
  }
}

export async function DELETE(req){
  try {
    await connectToDB();
    const user = await authMiddleware(req);
    const { id } = await req.json();

    const med = await Medication.findOneAndDelete({ _id: id, userId: user._id });
    if (!med) return new Response(JSON.stringify({ message: "Medication not found" }), { status: 404 });

    return new Response(JSON.stringify({ message: "Medication deleted" }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ message: "Server error", error: err.message }), { status: 500 });
  }
}
