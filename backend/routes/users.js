const express = require("express");
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  registerUser,
  loginUser,
} = require("../controllers/userController");
const { protect, authorize } = require("../middleware/auth");

// Public auth routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected profile routes
router
  .route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// Role-protected endpoints
router.get("/lender-only", protect, authorize("Lender", "Admin"), (req, res) => {
  res.json({ message: "Access granted: Lender area", role: req.user.role });
});

router.get("/loanofficer-only", protect, authorize("LoanOfficer", "Admin"), (req, res) => {
  res.json({ message: "Access granted: Loan Officer area", role: req.user.role });
});

router.get("/shared-access", protect, authorize("Lender", "LoanOfficer"), (req, res) => {
  res.json({ message: "Access granted: Shared Lender & Loan Officer area", role: req.user.role });
});

module.exports = router;

