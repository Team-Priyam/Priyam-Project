import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/microfinance";

async function seedAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB.");

    const email = process.argv[2] || process.env.DEFAULT_ADMIN_EMAIL || "admin@gmail.com";
    const password = process.argv[3] || process.env.DEFAULT_ADMIN_PASSWORD || "admin123";
    const name = process.argv[4] || "System Admin";

    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`⚠️ User with email "${email}" already exists in MongoDB.`);
      process.exit(0);
    }

    const admin = await User.create({
      name,
      email,
      password,
      role: "admin",
    });

    console.log("\n=========================================");
    console.log("✅ Admin User Created Successfully!");
    console.log(`- Name:     ${admin.name}`);
    console.log(`- Email:    ${admin.email}`);
    console.log(`- Password: ${password}`);
    console.log(`- Role:     ${admin.role}`);
    console.log("=========================================\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin user:", error.message);
    process.exit(1);
  }
}

seedAdmin();
