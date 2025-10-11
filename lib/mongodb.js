import mongoose from "mongoose";

const MONGODB_URI = "mongodb://localhost:27017/testdb";

if (!MONGODB_URI) throw new Error("Mongo URI missing");

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

export async function connectToDatabase() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false })
      .then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
