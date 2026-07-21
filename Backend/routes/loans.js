import express from "express";
import Loan from "../models/Loan.js";

const router = express.Router();

/**
 * @route   POST /api/loans
 * @desc    Create a new loan application in the database
 * @access  Public
 */
router.post("/", async (req, res) => {
  const { borrower, amount, term, purpose } = req.body;

  // Validate fields
  if (!borrower || amount === undefined || term === undefined || !purpose) {
    return res.status(400).json({
      success: false,
      message: "Please fill out all required fields: borrower, amount, term, and purpose",
    });
  }

  const numAmount = Number(amount);
  const numTerm = Number(term);

  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Loan amount must be a numeric value greater than 0",
    });
  }

  if (isNaN(numTerm) || !Number.isInteger(numTerm) || numTerm <= 0) {
    return res.status(400).json({
      success: false,
      message: "Loan term must be a positive whole number of months",
    });
  }

  try {
    const newLoan = await Loan.create({
      borrower: borrower.trim(),
      amount: numAmount,
      term: numTerm,
      purpose,
      status: "pending",
      statusHistory: [
        {
          status: "pending",
          action: "created",
          timestamp: new Date(),
          user: "Lender",
          note: "Loan application submitted by lender",
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Loan application created successfully",
      loan: newLoan,
    });
  } catch (error) {
    console.error("Create loan application error:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating loan application",
    });
  }
});

/**
 * @route   GET /api/loans
 * @desc    Get loan applications list with search, status, and date range filter capabilities
 * @access  Public
 */
router.get("/", async (req, res) => {
  try {
    const { search = "", status = "", startDate = "", endDate = "" } = req.query;

    const query = {};

    // Search by borrower name (case-insensitive regex)
    if (search.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.borrower = { $regex: escapedSearch, $options: "i" };
    }

    // Filter by status (pending, approved, rejected)
    if (status.trim() && ["pending", "approved", "rejected"].includes(status.trim())) {
      query.status = status.trim();
    }

    // Filter by application date range (createdAt)
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const loans = await Loan.find(query).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: loans.length,
      loans,
    });
  } catch (error) {
    console.error("Fetch loan applications error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching loan applications",
    });
  }
});

/**
 * @route   GET /api/loans/pending
 * @desc    Get all pending loan applications list
 * @access  Public
 */
router.get("/pending", async (req, res) => {
  try {
    const loans = await Loan.find({ status: "pending" }).sort({ createdAt: -1 });
    res.json({
      success: true,
      loans,
    });
  } catch (error) {
    console.error("Fetch pending loan applications error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching pending loan applications",
    });
  }
});

/**
 * @route   POST /api/loans/:id/approve
 * @desc    Approve a pending loan application
 * @access  Public
 */
router.post("/:id/approve", async (req, res) => {
  try {
    const { note, user } = req.body;
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan application not found",
      });
    }

    if (loan.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot approve loan application in '${loan.status}' status`,
      });
    }

    loan.status = "approved";
    loan.statusHistory.push({
      status: "approved",
      action: "approved",
      timestamp: new Date(),
      user: user || "Loan Officer",
      note: note || "Loan application approved by loan officer",
    });

    await loan.save();

    res.json({
      success: true,
      message: "Loan application approved successfully",
      loan,
    });
  } catch (error) {
    console.error("Approve loan application error:", error);
    res.status(500).json({
      success: false,
      message: "Server error approving loan application",
    });
  }
});

/**
 * @route   POST /api/loans/:id/reject
 * @desc    Reject a pending loan application
 * @access  Public
 */
router.post("/:id/reject", async (req, res) => {
  try {
    const { note, user } = req.body;
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan application not found",
      });
    }

    if (loan.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot reject loan application in '${loan.status}' status`,
      });
    }

    loan.status = "rejected";
    loan.statusHistory.push({
      status: "rejected",
      action: "rejected",
      timestamp: new Date(),
      user: user || "Loan Officer",
      note: note || "Loan application rejected by loan officer",
    });

    await loan.save();

    res.json({
      success: true,
      message: "Loan application rejected successfully",
      loan,
    });
  } catch (error) {
    console.error("Reject loan application error:", error);
    res.status(500).json({
      success: false,
      message: "Server error rejecting loan application",
    });
  }
});

/**
 * @route   DELETE /api/loans/:id
 * @desc    Delete a loan application by ID
 * @access  Public
 */
router.delete("/:id", async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan application not found",
      });
    }

    await Loan.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Loan application deleted successfully",
    });
  } catch (error) {
    console.error("Delete loan application error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting loan application",
    });
  }
});

export default router;
