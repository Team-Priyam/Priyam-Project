import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Helper to generate JWT signed with user ID & role
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || "default_jwt_secret_key",
    { expiresIn: "30d" }
  );
};

/**
 * @route   POST /api/auth/login
 * @desc    Verify credentials, compare bcrypt password hash & return JWT
 * @access  Public
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // 1. Basic field validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please enter both email and password.",
    });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    // Auto-create dummy account from .env if database is empty or matching dummy email
    const dummyEmail = (process.env.DUMMY_USER_EMAIL || "admin@microfinance.org").toLowerCase().trim();
    const dummyPassword = process.env.DUMMY_USER_PASSWORD || "Admin123Pass!";

    if (!user && (normalizedEmail === dummyEmail || (await User.countDocuments()) === 0)) {
      user = await User.create({
        name: process.env.DUMMY_USER_NAME || "Officer Priyam",
        email: dummyEmail,
        password: dummyPassword,
        role: process.env.DUMMY_USER_ROLE || "admin",
      });
    }

    // 3. Compare password using bcrypt via user schema instance method
    if (user && (await user.comparePassword(password))) {
      const token = generateToken(user._id, user.role);

      return res.status(200).json({
        success: true,
        message: "Authentication successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    }

    // 4. Invalid credentials response
    return res.status(401).json({
      success: false,
      message: "Invalid email or password.",
    });
  } catch (error) {
    console.error("Login verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error occurred during authentication.",
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Verify current JWT token & return user profile
 * @access  Private
 */
router.get("/me", protect, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching user session." });
  }
});

/**
 * @route   POST /api/auth/bootstrap
 * @desc    Bootstrap initial admin user if database is empty
 * @access  Public
 */
router.post("/bootstrap", async (req, res) => {
  try {
    const userCount = await User.countDocuments({});
    
    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message: "System is already bootstrapped with users.",
      });
    }

    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please specify name, email, and password for the admin account.",
      });
    }

    const newAdmin = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password,
      role: role || "admin",
    });

    const token = generateToken(newAdmin._id, newAdmin.role);

    res.status(201).json({
      success: true,
      message: "Admin account created successfully.",
      token,
      user: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    console.error("Bootstrap error:", error);
    res.status(500).json({ success: false, message: "Server error during bootstrapping" });
  }
});

export default router;

