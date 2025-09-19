import dbConnect from "../../../../lib/dbConnect";
import Medication from "../../../../lib/models/Medication";

export async function GET(req, { params }) {
  await dbConnect();

  try {
    const medication = await Medication.findById(params.id);
    if (!medication) {
      return new Response(JSON.stringify({ message: "Medication not found" }), {
        status: 404,
      });
    }
    return new Response(JSON.stringify(medication), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), {
      status: 500,
    });
  }
}

export async function PUT(req, { params }) {
  await dbConnect();

  try {
    const body = await req.json();
    const updatedMedication = await Medication.findByIdAndUpdate(
      params.id,
      body,
      { new: true }
    );
    if (!updatedMedication) {
      return new Response(JSON.stringify({ message: "Medication not found" }), {
        status: 404,
      });
    }
    return new Response(JSON.stringify(updatedMedication), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), {
      status: 400,
    });
  }
}

export async function DELETE(req, { params }) {
  await dbConnect();

  try {
    const deletedMedication = await Medication.findByIdAndDelete(params.id);
    if (!deletedMedication) {
      return new Response(JSON.stringify({ message: "Medication not found" }), {
        status: 404,
      });
    }
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
