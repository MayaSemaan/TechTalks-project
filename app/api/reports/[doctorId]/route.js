// app/api/reports/[doctorId]/route.js
import dbConnect from "../../../../lib/dbConnect.js";
import Report from "../../../../models/Report.js";

export async function GET(req, { params }) {
  await dbConnect();

  try {
    const { doctorId } = params;

    if (!doctorId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing doctor ID" }),
        { status: 400 }
      );
    }

    // Fetch all reports for this doctor, populate doctor & patient info
    const reports = await Report.find({ doctor: doctorId }).populate(
      "doctor patient"
    );

    return new Response(JSON.stringify({ success: true, reports }), {
      status: 200,
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
}
