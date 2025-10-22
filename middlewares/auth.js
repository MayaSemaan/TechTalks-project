import jwt from "jsonwebtoken";
import User from "../models/User.js";
import connectToDB from "../lib/db.js";

export const authenticate = async (req) => {
  try {
    await connectToDB();

    const authHeader = req.headers.get("authorization");
    console.log("Authorization header:", authHeader);
    if (!authHeader) throw new Error("No token provided");

    if (!authHeader.startsWith("Bearer "))
      throw new Error("Invalid token format");

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded:", decoded);

    const user = await User.findById(decoded.id).select("-password");
    console.log("Authenticated user:", user?.email);

    if (!user) throw new Error("User not found");

    return user;
  } catch (err) {
    console.error("Auth error:", err);
    throw new Error("Unauthorized: " + err.message);
  }
};
