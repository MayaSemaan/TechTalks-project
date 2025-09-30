import jwt from "jsonwebtoken";
import User from "../models/User.js";
import connectToDB from "../lib/db.js";

export const authenticate = async (req) => {
  try {
    await connectToDB();

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("No token provided");

    if (!authHeader.startsWith("Bearer "))
      throw new Error("Invalid token format");

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) throw new Error("User not found");

    return user;
  } catch (err) {
    throw new Error("Unauthorized: " + err.message);
  }
};
