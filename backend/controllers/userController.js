const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || "supersecretkey_rural_microfinance_2026",
    {
      expiresIn: "30d",
    }
  );
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        village: user.village,
        phone: user.phone,
        createdAt: user.createdAt,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message || "Server Error" });
  }
};

// @desc    Update user profile & password
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { name, village, phone, currentPassword, newPassword } = req.body;

    // Handle password update logic if newPassword is supplied
    if (newPassword && newPassword.trim().length > 0) {
      if (!currentPassword) {
        return res.status(400).json({
          message: "Current password is required to set a new password",
        });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "Current password verification failed" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          message: "New password must be at least 6 characters long",
        });
      }

      user.password = newPassword;
    }

    if (name) {
      if (name.trim().length === 0) {
        return res.status(400).json({ message: "Name cannot be empty" });
      }
      user.name = name.trim();
    }

    if (village !== undefined) user.village = village.trim();
    if (phone !== undefined) user.phone = phone.trim();

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      village: updatedUser.village,
      phone: updatedUser.phone,
      token: generateToken(updatedUser._id, updatedUser.role),
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: error.message || "Server Error" });
  }
};

// @desc    Register a new user (for testing & onboarding)
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, village, phone } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || "Lender",
      village: village || "Village Central",
      phone: phone || "",
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        village: user.village,
        phone: user.phone,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message || "Server Error" });
  }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        village: user.village,
        phone: user.phone,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message || "Server Error" });
  }
};

// @desc    Get Lender Dashboard data
// @route   GET /api/users/lender-dashboard
// @access  Private (Lender, Admin)
const getLenderDashboard = async (req, res) => {
  res.json({
    message: "Access granted: Lender Financial Dashboard",
    user: { id: req.user._id || req.tokenData.id, role: req.user.role || req.tokenData.role },
    data: { totalCapitalDisbursed: 500000, activeLendersCount: 12 },
  });
};

// @desc    Get Loan Officer Dashboard data
// @route   GET /api/users/loanofficer-dashboard
// @access  Private (LoanOfficer, Admin)
const getLoanOfficerDashboard = async (req, res) => {
  res.json({
    message: "Access granted: Loan Officer Operational Dashboard",
    user: { id: req.user._id || req.tokenData.id, role: req.user.role || req.tokenData.role },
    data: { pendingApprovals: 8, activeBorrowersCount: 45 },
  });
};

// @desc    Get Admin Panel
// @route   GET /api/users/admin-panel
// @access  Private (Admin only)
const getAdminPanel = async (req, res) => {
  res.json({
    message: "Access granted: System Administration Panel",
    user: { id: req.user._id || req.tokenData.id, role: req.user.role || req.tokenData.role },
    data: { systemStatus: "Healthy", activeUsers: 150 },
  });
};

// @desc    Get Shared Field Ops
// @route   GET /api/users/shared-field-ops
// @access  Private (Lender, LoanOfficer, Admin)
const getSharedFieldOps = async (req, res) => {
  res.json({
    message: "Access granted: Shared Village Field Operations",
    user: { id: req.user._id || req.tokenData.id, role: req.user.role || req.tokenData.role },
    data: { assignedVillages: ["Central Village", "East Hill"] },
  });
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  registerUser,
  loginUser,
  getLenderDashboard,
  getLoanOfficerDashboard,
  getAdminPanel,
  getSharedFieldOps,
};
