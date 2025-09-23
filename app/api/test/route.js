import { NextResponse } from "next/server";
import connectToDB from "../../../lib/db";
import User from "../../../models/User";
import Doctor from "../../../models/doctor";
import Medication from "../../../models/Medication";
import Report from "../../../models/reports";

const models = { User, Doctor, Medication, Report };

export async function GET(req) {
  await connectToDB();
  const { searchParams } = new URL(req.url);
  const model = searchParams.get("model"); // ?model=User
  const id = searchParams.get("id"); // ?id=...

  if (!model || !models[model]) {
    return NextResponse.json({ error: "Invalid model" }, { status: 400 });
  }

  if (id) {
    const doc = await models[model].findById(id);
    return NextResponse.json(doc || { error: "Not found" });
  } else {
    const docs = await models[model].find();
    return NextResponse.json(docs);
  }
}

export async function POST(req) {
  await connectToDB();
  const { model, data } = await req.json();

  if (!model || !models[model]) {
    return NextResponse.json({ error: "Invalid model" }, { status: 400 });
  }

  const created = await models[model].create(data);
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(req) {
  await connectToDB();
  const { model, id, data } = await req.json();

  if (!model || !models[model] || !id) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const updated = await models[model].findByIdAndUpdate(id, data, {
    new: true,
  });
  return NextResponse.json(updated || { error: "Not found" });
}

export async function DELETE(req) {
  await connectToDB();
  const { model, id } = await req.json();

  if (!model || !models[model] || !id) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const deleted = await models[model].findByIdAndDelete(id);
  return NextResponse.json(deleted || { error: "Not found" });
}
