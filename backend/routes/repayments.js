import express from "express";
import Repayment from "../models/Repayment.js";
import Notification from "../models/Notification.js";
import { sendOverdueNotification } from "../utils/mailer.js";

const router = express.Router();

/**
 * Helper to seed initial sample repayments if database is empty
 */
const seedSampleRepayments = async () => {
  const count = await Repayment.countDocuments();
  if (count === 0) {
    const today = new Date();
    
    const addDays = (days) => {
      const d = new Date(today);
      d.setDate(d.getDate() + days);
      return d;
    };

    const sampleRepayments = [
      {
        borrower: "Aarav Sharma",
        amountDue: 450,
        dueDate: addDays(1),
        status: "unpaid",
      },
      {
        borrower: "Priya Patel",
        amountDue: 1200,
        dueDate: addDays(3),
        status: "unpaid",
      },
      {
        borrower: "Rahul Gupta",
        amountDue: 750,
        dueDate: addDays(5),
        status: "unpaid",
      },
      {
        borrower: "Ananya Roy",
        amountDue: 320,
        dueDate: addDays(6),
        status: "unpaid",
      },
      {
        borrower: "Vikram Singh",
        amountDue: 1500,
        dueDate: addDays(12), // Outside 7-day window
        status: "unpaid",
      },
    ];

    await Repayment.insertMany(sampleRepayments);
    console.log("Seeded initial sample repayments for demonstration.");
  }
};

/**
 * @route   GET /api/repayments/upcoming
 * @desc    Get all repayments due within the next 7 days
 * @access  Public
 */
router.get("/upcoming", async (req, res) => {
  try {
    await seedSampleRepayments();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfSevenDays = new Date(startOfToday);
    endOfSevenDays.setDate(endOfSevenDays.getDate() + 7);
    endOfSevenDays.setHours(23, 59, 59, 999);

    const upcomingRepayments = await Repayment.find({
      dueDate: { $gte: startOfToday, $lte: endOfSevenDays },
      status: "unpaid",
    }).sort({ dueDate: 1 });

    res.json({
      success: true,
      count: upcomingRepayments.length,
      startDate: startOfToday,
      endDate: endOfSevenDays,
      repayments: upcomingRepayments,
    });
  } catch (error) {
    console.error("Fetch upcoming repayments error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching upcoming repayments",
    });
  }
});

/**
 * @route   GET /api/repayments
 * @desc    Get all repayments list
 * @access  Public
 */
router.get("/", async (req, res) => {
  try {
    await seedSampleRepayments();
    const repayments = await Repayment.find({}).sort({ dueDate: 1 });
    res.json({
      success: true,
      repayments,
    });
  } catch (error) {
    console.error("Fetch all repayments error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching repayments",
    });
  }
});

/**
 * @route   POST /api/repayments
 * @desc    Create a new repayment schedule record
 * @access  Public
 */
router.post("/", async (req, res) => {
  try {
    const { borrower, amountDue, dueDate, loanId } = req.body;

    if (!borrower || !amountDue || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "Please provide borrower, amountDue, and dueDate",
      });
    }

    const newRepayment = await Repayment.create({
      borrower: borrower.trim(),
      amountDue: Number(amountDue),
      dueDate: new Date(dueDate),
      loanId: loanId || null,
      status: "unpaid",
    });

    res.status(201).json({
      success: true,
      message: "Repayment schedule created successfully",
      repayment: newRepayment,
    });
  } catch (error) {
    console.error("Create repayment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating repayment record",
    });
  }
});

/**
 * @route   POST /api/repayments/:id/pay
 * @desc    Record payment for a repayment record
 * @access  Public
 */
router.post("/:id/pay", async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    const repayment = await Repayment.findById(req.params.id);

    if (!repayment) {
      return res.status(404).json({
        success: false,
        message: "Repayment record not found",
      });
    }

    if (repayment.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Repayment has already been recorded as paid",
      });
    }

    repayment.status = "paid";
    repayment.paidAt = new Date();
    if (paymentMethod) {
      repayment.paymentMethod = paymentMethod;
    }

    await repayment.save();

    res.json({
      success: true,
      message: "Payment recorded successfully",
      repayment,
    });
  } catch (error) {
    console.error("Record payment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error recording payment",
    });
  }
});

/**
 * @route   POST /api/repayments/process-overdue
 * @desc    Check missed repayment deadlines, update overdue status, and dispatch deduplicated notifications
 * @access  Public
 */
router.post("/process-overdue", async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Query repayments with due dates in the past and unpaid status
    const missedRepayments = await Repayment.find({
      dueDate: { $lt: startOfToday },
      status: "unpaid",
    });

    let newlyNotifiedCount = 0;
    const processedLogs = [];

    for (const item of missedRepayments) {
      const dueTime = new Date(item.dueDate);
      dueTime.setHours(0, 0, 0, 0);
      const diffMs = startOfToday.getTime() - dueTime.getTime();
      const daysOverdue = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      // Update status to overdue
      item.status = "overdue";

      // PRE-CHECK & DEDUPLICATION GUARD: Check before sending new notification
      if (item.overdueNotified === true) {
        console.log(`[Deduplication Guard] Skipping already notified overdue event for borrower: ${item.borrower} (Notified at: ${item.overdueNotifiedAt})`);
        await item.save();
        continue;
      }
        // 1. Create Borrower In-App Notification
        await Notification.create({
          recipientRole: "borrower",
          recipientName: item.borrower,
          recipientEmail: `${item.borrower.toLowerCase().replace(/\s+/g, ".")}@example.com`,
          title: "🚨 OVERDUE REPAYMENT NOTICE",
          message: `Your installment payment of $${Number(item.amountDue).toLocaleString()} is ${daysOverdue} day(s) past due. Please settle your account immediately to avoid penalty fees.`,
          type: "overdue_alert",
          repaymentId: item._id,
          amountDue: item.amountDue,
          dueDate: item.dueDate,
          isOverdue: true,
        });

        // 2. Create Lender In-App Notification
        await Notification.create({
          recipientRole: "lender",
          recipientName: "Lead Loan Officer",
          recipientEmail: "officer@microfinance.org",
          title: `⚠️ BORROWER OVERDUE ALERT: ${item.borrower}`,
          message: `Repayment for borrower ${item.borrower} ($${Number(item.amountDue).toLocaleString()}) is ${daysOverdue} day(s) overdue. Due date was ${item.dueDate.toISOString().split('T')[0]}.`,
          type: "overdue_alert",
          repaymentId: item._id,
          amountDue: item.amountDue,
          dueDate: item.dueDate,
          isOverdue: true,
        });

        // 3. Dispatch Multi-Recipient Email Notification
        await sendOverdueNotification({
          borrowerName: item.borrower,
          amountDue: item.amountDue,
          dueDate: item.dueDate,
          daysOverdue,
        });

        // Mark deduplication flag
        item.overdueNotified = true;
        item.overdueNotifiedAt = new Date();
        newlyNotifiedCount++;
        processedLogs.push({
          id: item._id,
          borrower: item.borrower,
          daysOverdue,
          notified: true,
        });
        await item.save();
      }

      res.json({
        success: true,
        message: `Overdue check complete. Evaluated ${missedRepayments.length} past-due repayments.`,
        overdueCount: missedRepayments.length,
        newlyNotifiedCount,
        repayments: missedRepayments,
        logs: processedLogs,
      });
  } catch (error) {
    console.error("Process overdue repayments error:", error);
    res.status(500).json({
      success: false,
      message: "Server error processing overdue repayments",
    });
  }
});

/**
 * @route   GET /api/repayments/overdue
 * @desc    Get all overdue repayments
 * @access  Public
 */
router.get("/overdue", async (req, res) => {
  try {
    const overdueRepayments = await Repayment.find({ status: "overdue" }).sort({ dueDate: 1 });
    res.json({
      success: true,
      count: overdueRepayments.length,
      repayments: overdueRepayments,
    });
  } catch (error) {
    console.error("Fetch overdue repayments error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching overdue repayments",
    });
  }
});

/**
 * @route   GET /api/repayments/missed
 * @desc    Query repayments with due dates in the past and unpaid status
 * @access  Public
 */
router.get("/missed", async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const missedRepayments = await Repayment.find({
      dueDate: { $lt: startOfToday },
      status: "unpaid",
    }).sort({ dueDate: 1 });

    res.json({
      success: true,
      count: missedRepayments.length,
      repayments: missedRepayments,
    });
  } catch (error) {
    console.error("Fetch missed repayments error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching missed repayments",
    });
  }
});

/**
 * @route   GET /api/repayments/notifications
 * @desc    Get all overdue notification logs
 * @access  Public
 */
router.get("/notifications", async (req, res) => {
  try {
    const notifications = await Notification.find({}).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("Fetch notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching notifications",
    });
  }
});

export default router;
