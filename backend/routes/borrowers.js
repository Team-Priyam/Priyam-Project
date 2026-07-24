const express = require("express");
const router = express.Router();
const {
  getBorrowers,
  getBorrowerById,
  createBorrower,
  addRepayment,
} = require("../controllers/borrowerController");
const { protect } = require("../middleware/auth");

// All borrower routes are protected by JWT auth
router.use(protect);

router.route("/")
  .get(getBorrowers)
  .post(createBorrower);

router.route("/:id")
  .get(getBorrowerById);

router.route("/:id/repayments")
  .post(addRepayment);

module.exports = router;

