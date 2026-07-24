const express = require("express");
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  registerUser,
  loginUser,
  getLenderDashboard,
  getLoanOfficerDashboard,
  getAdminPanel,
  getSharedFieldOps,
} = require("../controllers/userController");
const {
  protect,
  authorize,
  requireLender,
  requireLoanOfficer,
  requireAdmin,
} = require("../middleware/auth");

// Public auth routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected profile routes (Authenticated users)
router
  .route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// Role-protected endpoints using middleware
router.get("/lender-only", protect, requireLender, (req, res) => {
  res.json({ message: "Access granted: Lender area", role: (req.user && req.user.role) || req.tokenData.role });
});

router.get("/loanofficer-only", protect, requireLoanOfficer, (req, res) => {
  res.json({ message: "Access granted: Loan Officer area", role: (req.user && req.user.role) || req.tokenData.role });
});

router.get("/shared-access", protect, authorize("Lender", "LoanOfficer"), (req, res) => {
  res.json({ message: "Access granted: Shared Lender & Loan Officer area", role: (req.user && req.user.role) || req.tokenData.role });
});

// Domain-level role-restricted endpoints
router.get("/lender-dashboard", protect, requireLender, getLenderDashboard);
router.get("/loanofficer-dashboard", protect, requireLoanOfficer, getLoanOfficerDashboard);
router.get("/admin-panel", protect, requireAdmin, getAdminPanel);
router.get("/shared-field-ops", protect, authorize("Lender", "LoanOfficer", "Admin"), getSharedFieldOps);

module.exports = router;

