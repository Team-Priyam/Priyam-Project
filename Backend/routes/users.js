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

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete a user account
 * @access  Private/Admin
 */
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    // Prevent self-deletion
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "Administrators cannot delete their own account." });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, message: "Server error deleting user" });
  }
});

/**
 * @route   GET /api/users/preferences
 * @desc    Get notification preferences for the logged-in user
 * @access  Private
 */
router.get("/preferences", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("notificationPreferences name email role");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const defaultPrefs = {
      repaymentReminders: true,
      overdueAlerts: true,
      applicationUpdates: true,
      systemDigest: false,
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
    };

    const preferences = { ...defaultPrefs, ...(user.notificationPreferences?.toObject ? user.notificationPreferences.toObject() : user.notificationPreferences || {}) };

    res.json({
      success: true,
      preferences,
    });
  } catch (error) {
    console.error("Get preferences error:", error);
    res.status(500).json({ success: false, message: "Server error retrieving preferences" });
  }
});

/**
 * @route   PUT /api/users/preferences
 * @desc    Update notification preferences for the logged-in user
 * @access  Private
 */
router.put("/preferences", protect, async (req, res) => {
  try {
    const { preferences } = req.body;
    if (!preferences || typeof preferences !== "object") {
      return res.status(400).json({ success: false, message: "Invalid preferences data provided" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.notificationPreferences = {
      ...user.notificationPreferences,
      ...preferences,
    };

    await user.save();

    res.json({
      success: true,
      message: "Notification preferences saved successfully!",
      preferences: user.notificationPreferences,
    });
  } catch (error) {
    console.error("Update preferences error:", error);
    res.status(500).json({ success: false, message: "Server error saving preferences" });
  }
});

export default router;
