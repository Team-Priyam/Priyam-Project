import express from "express";
import Loan from "../models/Loan.js";

const router = express.Router();

/**
 * Helper to compute overdue status and amounts based on due dates and repayments
 * @param {Object} loan 
 * @returns {Object} Calculated overdue metadata
 */
export const calculateOverdueStatus = (loan) => {
  const now = new Date();
  const installment = loan.monthlyInstallment || Math.round(loan.amount / loan.term);
  
  // Calculate total repayments recorded in repayments array
  const totalRepaymentsSum = (loan.repayments || []).reduce(
    (sum, r) => sum + (Number(r.amount) || 0),
    0
  );
  const totalPaid = Math.max(loan.totalPaid || 0, totalRepaymentsSum);
  const remainingBalance = Math.max(0, loan.amount - totalPaid);

  let dueDate = loan.dueDate ? new Date(loan.dueDate) : null;
  if (!dueDate && loan.status === "approved") {
    // Default fallback for approved loans without due dates set
    dueDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  }

  const isPastDue = dueDate ? dueDate < now : false;
  const daysOverdue = dueDate && isPastDue 
    ? Math.max(0, Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24)))
    : 0;

  let overdueAmount = loan.overdueAmount || 0;
  if (remainingBalance > 0 && (isPastDue || overdueAmount > 0)) {
    if (overdueAmount <= 0) {
      overdueAmount = Math.min(installment, remainingBalance);
    }
  } else {
    overdueAmount = 0;
  }

  const isOverdue = remainingBalance > 0 && overdueAmount > 0;

  return {
    isOverdue,
    daysOverdue,
    overdueAmount,
    remainingBalance,
    totalPaid,
    installment,
    dueDate,
  };
};

/**
 * @route   GET /api/repayments/overdue
 * @desc    Fetch all loans with overdue repayments based on due dates and recorded repayments
 * @access  Public
 */
router.get("/overdue", async (req, res) => {
  try {
    const approvedLoans = await Loan.find({ status: "approved" }).sort({ createdAt: -1 });

    const overdueLoans = [];

    for (const loan of approvedLoans) {
      const calc = calculateOverdueStatus(loan);

      if (calc.isOverdue) {
        // Sync calculated fields to database if needed
        let needsSave = false;

        if (loan.totalPaid !== calc.totalPaid) {
          loan.totalPaid = calc.totalPaid;
          needsSave = true;
        }

        if (loan.overdueAmount !== calc.overdueAmount) {
          loan.overdueAmount = calc.overdueAmount;
          needsSave = true;
        }

        if (!loan.dueDate && calc.dueDate) {
          loan.dueDate = calc.dueDate;
          needsSave = true;
        }

        if (needsSave) {
          await loan.save();
        }

        const loanObj = loan.toObject();
        overdueLoans.push({
          ...loanObj,
          daysOverdue: calc.daysOverdue,
          remainingBalance: calc.remainingBalance,
          monthlyInstallment: calc.installment,
        });
      }
    }

    const totalOverdueAmount = overdueLoans.reduce(
      (sum, l) => sum + (l.overdueAmount || 0),
      0
    );

    res.json({
      success: true,
      count: overdueLoans.length,
      totalOverdueAmount,
      loans: overdueLoans,
    });
  } catch (error) {
    console.error("Error fetching overdue repayments:", error);
    res.status(500).json({
      success: false,
      message: "Server error calculating overdue loan repayments",
    });
  }
});

/**
 * @route   POST /api/repayments
 * @desc    Record a new repayment and recalculate overdue status & due dates
 * @access  Public
 */
router.post("/", async (req, res) => {
  try {
    const { loanId, amount, note, user } = req.body;
    const numAmount = Number(amount);

    if (!loanId) {
      return res.status(400).json({
        success: false,
        message: "loanId is required to record a repayment",
      });
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Repayment amount must be a positive number",
      });
    }

    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    // Record repayment entry
    loan.repayments.push({
      amount: numAmount,
      paidAt: new Date(),
      recordedBy: user || "Loan Officer",
      note: note || "Repayment recorded",
    });

    loan.totalPaid = (loan.totalPaid || 0) + numAmount;
    loan.overdueAmount = Math.max(0, (loan.overdueAmount || 0) - numAmount);

    loan.statusHistory.push({
      status: loan.status,
      action: "repayment_recorded",
      timestamp: new Date(),
      user: user || "Loan Officer",
      note: `Recorded repayment of $${numAmount.toLocaleString()}${note ? `. ${note}` : ""}`,
    });

    // Advance due date if overdue balance is cleared
    if (loan.overdueAmount === 0) {
      loan.dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    await loan.save();

    const calc = calculateOverdueStatus(loan);

    res.json({
      success: true,
      message: `Repayment of $${numAmount.toLocaleString()} recorded successfully`,
      loan,
      overdueStatus: calc,
    });
  } catch (error) {
    console.error("Record repayment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error processing repayment",
    });
  }
});

/**
 * @route   GET /api/repayments/history/:loanId
 * @desc    Fetch repayment transaction history for a loan
 * @access  Public
 */
router.get("/history/:loanId", async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.loanId);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    res.json({
      success: true,
      loanId: loan._id,
      borrower: loan.borrower,
      totalPaid: loan.totalPaid || 0,
      overdueAmount: loan.overdueAmount || 0,
      repayments: loan.repayments || [],
    });
  } catch (error) {
    console.error("Fetch repayment history error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching repayment history",
    });
  }
});

export default router;
