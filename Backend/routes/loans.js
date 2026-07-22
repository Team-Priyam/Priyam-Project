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
 * @route   GET /api/loans/:id/status
 * @desc    Retrieve status and complete status history timeline for a loan
 * @access  Public
 */
router.get("/:id/status", async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
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
      status: loan.status,
      statusHistory: loan.statusHistory,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
    });
  } catch (error) {
    console.error("Fetch loan status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching loan status history",
    });
  }
});

/**
 * @route   GET /api/loans/:id
 * @desc    Get single loan application details by ID
 * @access  Public
 */
router.get("/:id", async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan application not found",
      });
    }

    res.json({
      success: true,
      loan,
    });
  } catch (error) {
    console.error("Fetch single loan application error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching loan application",
    });
  }
});

/**
 * @route   GET /api/loans/overdue
 * @desc    Get all loans with overdue repayments
 * @access  Public
 */
router.get("/overdue", async (req, res) => {
  try {
    const allApproved = await Loan.find({ status: "approved" }).sort({ createdAt: -1 });

    const overdueLoans = [];
    const now = new Date();

    for (const loan of allApproved) {
      const installment = loan.monthlyInstallment || Math.round(loan.amount / loan.term);

      // If dueDate is not set, set default to 5 days ago (so approved loans default to overdue for tracking)
      if (!loan.dueDate) {
        loan.dueDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
        loan.monthlyInstallment = installment;
        if (loan.overdueAmount === 0 && loan.totalPaid < loan.amount) {
          loan.overdueAmount = Math.min(installment, loan.amount - loan.totalPaid);
        }
        await loan.save();
      }

      // Check if overdue
      const isPastDue = new Date(loan.dueDate) < now;
      const remainingBalance = loan.amount - (loan.totalPaid || 0);

      if (remainingBalance > 0 && (loan.overdueAmount > 0 || isPastDue)) {
        // Ensure overdueAmount has a positive value
        if (loan.overdueAmount <= 0) {
          loan.overdueAmount = Math.min(installment, remainingBalance);
          await loan.save();
        }
        overdueLoans.push(loan);
      }
    }

    const totalOverdueAmount = overdueLoans.reduce((sum, l) => sum + (l.overdueAmount || 0), 0);

    res.json({
      success: true,
      count: overdueLoans.length,
      totalOverdueAmount,
      loans: overdueLoans,
    });
  } catch (error) {
    console.error("Fetch overdue loans error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching overdue loans",
    });
  }
});

/**
 * @route   POST /api/loans/:id/repay
 * @desc    Record a repayment for a loan application
 * @access  Public
 */
router.post("/:id/repay", async (req, res) => {
  try {
    const { amount, note, user } = req.body;
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Repayment amount must be a positive number",
      });
    }

    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan application not found",
      });
    }

    // Record repayment transaction
    loan.totalPaid = (loan.totalPaid || 0) + numAmount;
    loan.overdueAmount = Math.max(0, (loan.overdueAmount || 0) - numAmount);
    
    loan.repayments.push({
      amount: numAmount,
      paidAt: new Date(),
      recordedBy: user || "Officer/Lender",
      note: note || "Repayment recorded",
    });

    loan.statusHistory.push({
      status: loan.status,
      action: "repayment_recorded",
      timestamp: new Date(),
      user: user || "Officer/Lender",
      note: `Recorded repayment of $${numAmount.toLocaleString()}${note ? `. ${note}` : ""}`,
    });

    // Reset due date into future if overdue balance is cleared
    if (loan.overdueAmount === 0) {
      loan.dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    await loan.save();

    res.json({
      success: true,
      message: `Repayment of $${numAmount.toLocaleString()} recorded successfully`,
      loan,
    });
  } catch (error) {
    console.error("Record repayment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error recording repayment",
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

    const installment = Math.round(loan.amount / loan.term);

    loan.status = "approved";
    loan.monthlyInstallment = installment;
    loan.dueDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // Set 5 days past due for active tracking
    loan.overdueAmount = installment;

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
