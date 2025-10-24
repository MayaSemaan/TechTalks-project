import { NextResponse } from "next/server";
import connectToDB from "../../../../../../lib/db.js";
import User from "../../../../../../models/User.js";
import Medication from "../../../../../../models/Medication.js";
import Report from "../../../../../../models/Report.js";
import { authenticate } from "../../../../../../middlewares/auth.js";

export async function GET(req, { params }) {
  try {
    const familyUser = await authenticate(req);
    await connectToDB();

    const { familyId } = params;
    if (!familyId) {
      return NextResponse.json(
        { success: false, error: "FamilyId is required" },
        { status: 400 }
      );
    }

    // Fetch family user with linked patients
    const family = await User.findById(familyId)
      .populate("linkedPatients", "name email role")
      .lean();

    if (!family) {
      return NextResponse.json(
        { success: false, error: "Family user not found" },
        { status: 404 }
      );
    }

    const patients = await Promise.all(
      (family.linkedPatients || []).map(async (p) => {
        // Count medications for patient
        const meds = await Medication.find({ userId: p._id }).lean();
        const totalMedications = meds.length;

        // Count reports
        const totalReports = await Report.countDocuments({ patient: p._id });

        return {
          _id: p._id,
          name: p.name,
          email: p.email,
          role: p.role,
          totalMedications,
          totalReports,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        familyName: family.name,
        totalPatients: patients.length,
        patients,
      },
    });
  } catch (err) {
    console.error("Family Patients GET error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
