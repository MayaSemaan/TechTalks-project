import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import User from "./models/User.js";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/smart-medicine";

const usersData = [
  {
    name: "John Doe",
    email: "john@example.com",
    password: "123456",
    role: "patient",
  },
  {
    name: "Jane Smith",
    email: "jane@example.com",
    password: "123456",
    role: "patient",
  },
];

async function seedAndListUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to DB");

    // Seed users if they don't exist
    for (const u of usersData) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        const user = new User({
          name: u.name,
          email: u.email,
          password: hashedPassword,
          role: u.role,
        });
        await user.save();
        console.log(`Created user: ${u.name} (${u.email})`);
      } else {
        console.log(`User already exists: ${u.email}`);
      }
    }

    // List all users
    const users = await User.find(
      {},
      { _id: 1, name: 1, email: 1, role: 1 }
    ).lean();
    console.log("\nAll Users in DB:");
    users.forEach((u) => {
      console.log(
        `Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, _id: ${u._id}`
      );
    });

    await mongoose.disconnect();
    console.log("\nDisconnected from DB");
  } catch (err) {
    console.error("Error:", err);
  }
}

seedAndListUsers();
