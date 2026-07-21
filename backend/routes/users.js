import express from "express";
import crypto from "crypto";
import User from "../models/User.js";
import { sendOnboardingEmail } from "../utils/mailer.js";

const router = express.Router();

/**
 * Helper handler to create a user (used by POST / and POST /add)
 */
const createUserHandler = async (req, res) => {
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
  const normalizedRole = role.toLowerCase();
  if (!["admin", "lender", "officer"].includes(normalizedRole)) {
    return res.status(400).json({
      success: false,
      message: "Invalid role specified. Must be 'admin', 'lender', or 'officer'",
    });
  }

  try {
    // 2. Prevent duplicate email registration
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: `A user with the email address "${email}" is already registered.`,
      });
    }

    // 3. Generate a secure temporary password
    const temporaryPassword = crypto.randomBytes(5).toString("hex");

    // 4. Create new user
    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      role: normalizedRole,
      password: temporaryPassword,
    });

    // 5. Send onboarding email with temporary password and login instructions
    const mailResult = await sendOnboardingEmail(email, name, temporaryPassword);

    res.status(201).json({
      success: true,
      message: "User registered successfully and notified via email.",
      _id: newUser._id,
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt,
      user: {
        id: newUser._id,
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
      emailDeliveryMode: mailResult.mode,
      temporaryPassword,
    });
  } catch (error) {
    console.error("User registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during user registration",
    });
  }
};

/**
 * @route   POST /api/users or POST /api/users/add
 * @desc    Create a new user (Lender or Loan Officer)
 * @access  Public
 */
router.post("/", createUserHandler);
router.post("/add", createUserHandler);

/**
 * @route   GET /api/users
 * @desc    Get all users list (Lenders, Officers, Admins)
 * @access  Public
 */
router.get("/", async (req, res) => {
  try {
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("Fetch users list error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user list",
    });
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete a user by ID
 * @access  Public
 */
router.delete("/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, message: `User "${user.name}" deleted successfully` });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, message: "Server error deleting user" });
  }
});

export default router;
