import dbConnect from "../../../lib/dbConnect";
import Medication from "../../../lib/models/Medication";

// GET all medications
export async function GET(req) {
  await dbConnect();

  try {
    const medications = await Medication.find();
    return new Response(JSON.stringify(medications), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), {
      status: 500,
    });
  }
}

// GET single medication by ID
export async function GET_BY_ID(req, { params }) {
  await dbConnect();

  try {
    const medication = await Medication.findById(params.id);
    if (!medication)
      return new Response(JSON.stringify({ message: "Medication not found" }), {
        status: 404,
      });
    return new Response(JSON.stringify(medication), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), {
      status: 500,
    });
  }
}

// CREATE a new medication
export async function POST(req) {
  await dbConnect();

  try {
    const body = await req.json();
    const medication = await Medication.create(body);
    return new Response(JSON.stringify(medication), { status: 201 });
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), {
      status: 400,
    });
  }
}

// UPDATE a medication
export async function PUT(req, { params }) {
  await dbConnect();

  try {
    const body = await req.json();
    const updatedMedication = await Medication.findByIdAndUpdate(
      params.id,
      body,
      { new: true }
    );
    if (!updatedMedication)
      return new Response(JSON.stringify({ message: "Medication not found" }), {
        status: 404,
      });
    return new Response(JSON.stringify(updatedMedication), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), {
      status: 400,
    });
  }
}

// DELETE a medication
export async function DELETE(req, { params }) {
  await dbConnect();

  try {
    const deletedMedication = await Medication.findByIdAndDelete(params.id);
    if (!deletedMedication)
      return new Response(JSON.stringify({ message: "Medication not found" }), {
        status: 404,
      });
    return new Response(
      JSON.stringify({ message: "Medication deleted successfully" }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), {
      status: 500,
    });
  }
}
