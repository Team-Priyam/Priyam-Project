import express from "express";
import Notification from "../models/Notification.js";
import Loan from "../models/Loan.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

/**
 * @route   GET /api/notifications
 * @desc    Get all recent notifications for logged-in loan officer / user
 * @access  Private
 */
router.get("/", protect, async (req, res) => {
  try {
    const userRole = req.user?.role || "officer";
    const userEmail = req.user?.email || "";

    let notifications = await Notification.find({
      $or: [{ recipient: "all" }, { recipient: userRole }, { recipient: userEmail }],
    })
      .sort({ createdAt: -1 })
      .limit(50);

    // If notifications collection is empty, dynamically generate seed notifications from active loans
    if (notifications.length === 0) {
      const activeLoans = await Loan.find({}).sort({ updatedAt: -1 }).limit(20);
      const generated = [];

      for (const loan of activeLoans) {
        if (loan.status === "approved" && (loan.overdueAmount > 0 || (loan.dueDate && new Date(loan.dueDate) < new Date()))) {
          generated.push({
            borrower: loan.borrower,
            loanId: loan._id,
            eventType: "overdue",
            title: `Overdue Repayment Alert: ${loan.borrower}`,
            message: `Repayment of $${Number(loan.overdueAmount || loan.monthlyInstallment || 0).toLocaleString()} is past due date. Immediate collection required.`,
            isRead: false,
            meta: {
              amount: loan.overdueAmount || loan.monthlyInstallment || 0,
              dueDate: loan.dueDate,
              status: loan.status,
            },
            createdAt: loan.dueDate || new Date(),
          });
        } else if (loan.status === "pending") {
          generated.push({
            borrower: loan.borrower,
            loanId: loan._id,
            eventType: "application",
            title: `Pending Loan Application: ${loan.borrower}`,
            message: `New loan application of $${Number(loan.amount).toLocaleString()} for "${loan.purpose}" awaits officer review.`,
            isRead: false,
            meta: {
              amount: loan.amount,
              dueDate: null,
              status: loan.status,
            },
            createdAt: loan.createdAt,
          });
        } else if (loan.status === "approved") {
          generated.push({
            borrower: loan.borrower,
            loanId: loan._id,
            eventType: "repayment",
            title: `Upcoming Repayment Due: ${loan.borrower}`,
            message: `Scheduled monthly installment of $${Number(loan.monthlyInstallment || Math.round(loan.amount / loan.term)).toLocaleString()} due soon.`,
            isRead: true,
            meta: {
              amount: loan.monthlyInstallment || Math.round(loan.amount / loan.term),
              dueDate: loan.dueDate,
              status: loan.status,
            },
            createdAt: loan.updatedAt,
          });
        }
      }

      if (generated.length > 0) {
        notifications = await Notification.insertMany(generated);
      }
    }

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error("Fetch notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching recent notifications",
    });
  }
});

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark a single notification as read
 * @access  Private
 */
router.put("/:id/read", protect, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("Mark read error:", error);
    res.status(500).json({ success: false, message: "Server error updating notification status" });
  }
});

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put("/read-all", protect, async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });

    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all read error:", error);
    res.status(500).json({ success: false, message: "Server error marking all notifications as read" });
  }
});

export default router;
