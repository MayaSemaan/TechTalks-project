import { NextResponse } from "next/server";
import connectToDB from "../../../lib/db.js";
import Medication from "../../../models/Medication.js";
import User from "../../../models/User.js";
import { authenticate } from "../../../middlewares/auth.js";
import mongoose from "mongoose";

// GET all medications for logged-in user
export async function GET(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    let meds;
    if (user.role === "family") {
      // Family sees medications of linked patients
      const linkedPatientIds = user.linkedFamily.map((id) => id.toString());
      meds = await Medication.find({ userId: { $in: linkedPatientIds } }).sort({
        createdAt: -1,
      });
    } else {
      // Patient or doctor sees own meds
      meds = await Medication.find({ userId: user._id }).sort({
        createdAt: -1,
      });
    }

    return NextResponse.json(meds);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// CREATE a new medication
export async function POST(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    const data = await req.json();

    // If family, validate userId against linked patients
    if (user.role === "family") {
      const linkedPatientIds = user.linkedFamily.map((id) => id.toString());
      if (!data.userId || !linkedPatientIds.includes(data.userId)) {
        return NextResponse.json(
          { error: "Unauthorized or invalid userId" },
          { status: 403 }
        );
      }
    }

    // Validate that the userId exists in DB
    const userExists = await User.findById(data.userId || user._id);
    if (!userExists) {
      return NextResponse.json(
        { error: "User does not exist" },
        { status: 400 }
      );
    }

    // Assign userId if not provided (for non-family roles)
    const medData = {
      ...data,
      userId: data.userId || user._id,
    };

    const med = await Medication.create(medData);
    return NextResponse.json(med, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// UPDATE an existing medication
export async function PUT(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    const { id, ...updates } = await req.json();
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid or missing ID" },
        { status: 400 }
      );
    }

    let med;
    if (user.role === "family") {
      const linkedPatientIds = user.linkedFamily.map((id) => id.toString());
      med = await Medication.findOneAndUpdate(
        { _id: id, userId: { $in: linkedPatientIds } },
        updates,
        { new: true }
      );
    } else {
      med = await Medication.findOneAndUpdate(
        { _id: id, userId: user._id },
        updates,
        { new: true }
      );
    }

    if (!med)
      return NextResponse.json(
        { error: "Medication not found or unauthorized" },
        { status: 404 }
      );

    return NextResponse.json(med);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// DELETE a medication
export async function DELETE(req) {
  try {
    const user = await authenticate(req);
    await connectToDB();

    const { id } = await req.json();
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid or missing ID" },
        { status: 400 }
      );
    }

    let med;
    if (user.role === "family") {
      const linkedPatientIds = user.linkedFamily.map((id) => id.toString());
      med = await Medication.findOneAndDelete({
        _id: id,
        userId: { $in: linkedPatientIds },
      });
    } else {
      med = await Medication.findOneAndDelete({ _id: id, userId: user._id });
    }

    if (!med)
      return NextResponse.json(
        { error: "Medication not found or unauthorized" },
        { status: 404 }
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
