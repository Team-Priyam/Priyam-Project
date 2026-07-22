const express = require("express");
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  registerUser,
  loginUser,
} = require("../controllers/userController");
const { protect } = require("../middleware/auth");

// Public auth routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected profile routes
router
  .route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

module.exports = router;
