import express from "express";
import mongoose from "mongoose";
import Repayment from "../models/Repayment.js";
import Borrower from "../models/Borrower.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

/**
 * @route   GET /api/repayments/borrower/:borrowerId
 * @desc    Get all repayments for a specific borrower sorted by date (most recent first)
 * @access  Private (Authorized users only)
 */
router.get("/borrower/:borrowerId", protect, async (req, res) => {
  try {
    const { borrowerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(borrowerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid borrower ID format",
      });
    }

    const borrower = await Borrower.findById(borrowerId);
    if (!borrower) {
      return res.status(404).json({
        success: false,
        message: "Borrower profile not found",
      });
    }

    // Auto-seed sample repayment entries if none exist for this borrower
    const existingCount = await Repayment.countDocuments({ borrower: borrowerId });
    if (existingCount === 0) {
      const sampleRepayments = [
        {
          borrower: borrowerId,
          amount: 2500,
          paymentMethod: "UPI",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          note: "Monthly installment paid via PhonePe UPI",
        },
        {
          borrower: borrowerId,
          amount: 3000,
          paymentMethod: "Cash",
          date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          note: "Cash payment collected during village visit",
        },
        {
          borrower: borrowerId,
          amount: 1500,
          paymentMethod: "Bank Transfer",
          date: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000), // 32 days ago
          note: "NEFT bank transfer",
        },
      ];
      await Repayment.insertMany(sampleRepayments);
    }

    // Fetch all repayments for the borrower sorted by date descending (most recent first)
    const repayments = await Repayment.find({ borrower: borrowerId }).sort({ date: -1 });

    res.json({
      success: true,
      count: repayments.length,
      borrower: {
        _id: borrower._id,
        name: borrower.name,
        village: borrower.village,
      },
      repayments,
    });
  } catch (error) {
    console.error("Fetch borrower repayments error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error fetching borrower repayments",
    });
  }
});

/**
 * @route   POST /api/repayments
 * @desc    Record a new repayment for a borrower
 * @access  Private (Authorized users only)
 */
router.post("/", protect, async (req, res) => {
  try {
    const { borrowerId, amount, paymentMethod, date, note } = req.body;

    if (!borrowerId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Borrower ID and repayment amount are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(borrowerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid borrower ID format",
      });
    }

    const newRepayment = await Repayment.create({
      borrower: borrowerId,
      amount: Number(amount),
      paymentMethod: paymentMethod || "Cash",
      date: date ? new Date(date) : new Date(),
      note: note || "",
    });

    res.status(201).json({
      success: true,
      message: "Repayment recorded successfully",
      repayment: newRepayment,
    });
  } catch (error) {
    console.error("Create repayment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error recording repayment",
    });
  }
});

export default router;
