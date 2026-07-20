import express from "express";
import crypto from "crypto";
import User from "../models/User.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { sendOnboardingEmail } from "../utils/mailer.js";

const router = express.Router();

/**
 * @route   POST /api/users/add
 * @desc    Create a new user (Lender or Loan Officer) by an Administrator
 * @access  Private/Admin
 */
router.post("/add", protect, adminOnly, async (req, res) => {
  const { name, email, role } = req.body;

  // 1. Basic field validation
  if (!name || !email || !role) {
    return res.status(400).json({
      success: false,
      message: "Please provide name, email, and role",
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address",
    });
  }

  // Validate role
  if (!["admin", "lender", "officer"].includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Invalid role specified. Must be 'admin', 'lender', or 'officer'",
    });
  }

  try {
    // 2. Prevent duplicate email registration
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: `A user with the email address "${email}" is already registered.`,
      });
    }

    // 3. Generate a secure temporary password
    // Generates a random 10-character alphanumeric password
    const temporaryPassword = crypto.randomBytes(5).toString("hex");

    // 4. Create new user (pre-save middleware in User.js hashes the password)
    const newUser = await User.create({
      name,
      email,
      role,
      password: temporaryPassword,
    });

    // 5. Send onboarding email with temporary password and login instructions
    const mailResult = await sendOnboardingEmail(email, name, temporaryPassword);

    res.status(201).json({
      success: true,
      message: "User registered successfully and notified via email.",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
      emailDeliveryMode: mailResult.mode,
      // Returned for testing ease in development mode
      temporaryPassword,
    });
  } catch (error) {
    console.error("User registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during user registration",
    });
  }
});

/**
 * @route   GET /api/users
 * @desc    Get all users list (Lenders, Officers, Admins)
 * @access  Private/Admin
 */
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });
    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Fetch users list error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user list",
    });
  }
});

export default router;
