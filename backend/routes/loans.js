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
 * @desc    Get all loan applications list
 * @access  Public
 */
router.get("/", async (req, res) => {
  try {
    const loans = await Loan.find({}).sort({ createdAt: -1 });
    res.json({
      success: true,
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
 * @desc    Approve a pending loan application, update status to 'approved', and log timestamp/user
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

    const evaluatorUser = user && user.trim() ? user.trim() : "Loan Officer";
    const auditNote = note && note.trim() ? note.trim() : `Loan application approved by ${evaluatorUser}`;
    const timestamp = new Date();

    loan.status = "approved";
    loan.statusHistory.push({
      status: "approved",
      action: "approved",
      timestamp,
      user: evaluatorUser,
      note: auditNote,
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
 * @desc    Reject a pending loan application, update status to 'rejected', and log timestamp/user
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

    const evaluatorUser = user && user.trim() ? user.trim() : "Loan Officer";
    const auditNote = note && note.trim() ? note.trim() : `Loan application rejected by ${evaluatorUser}`;
    const timestamp = new Date();

    loan.status = "rejected";
    loan.statusHistory.push({
      status: "rejected",
      action: "rejected",
      timestamp,
      user: evaluatorUser,
      note: auditNote,
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

/**
 * @route   GET /api/loans/audit-trail
 * @desc    Get complete audit trail history for all approval and rejection actions
 * @access  Public
 */
router.get("/audit-trail", async (req, res) => {
  try {
    const loans = await Loan.find({}, "borrower status statusHistory createdAt updatedAt").sort({ updatedAt: -1 });
    const fullAuditTrail = loans.map((loan) => ({
      loanId: loan._id,
      borrower: loan.borrower,
      currentStatus: loan.status,
      auditHistory: loan.statusHistory || [],
    }));

    res.json({
      success: true,
      count: fullAuditTrail.length,
      auditLogs: fullAuditTrail,
    });
  } catch (error) {
    console.error("Fetch full audit trail error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching audit trail",
    });
  }
});

/**
 * @route   GET /api/loans/:id/audit
 * @desc    Get audit trail history for a specific loan application
 * @access  Public
 */
router.get("/:id/audit", async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id).select("borrower status statusHistory createdAt updatedAt");
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan application not found",
      });
    }

    res.json({
      success: true,
      loanId: loan._id,
      borrower: loan.borrower,
      currentStatus: loan.status,
      auditHistory: loan.statusHistory || [],
    });
  } catch (error) {
    console.error("Fetch loan audit trail error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching loan audit trail",
    });
  }
});

export default router;
