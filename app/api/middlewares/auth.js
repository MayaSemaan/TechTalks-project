import jwt from "jsonwebtoken";
import User from "../../../models/User.js";

export const authenticate = async (req) => {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("No token provided");
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) throw new Error("User not found");

    return user;
  } catch (err) {
    throw new Error("Unauthorized: " + err.message);
  }
};
