import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientRole: {
      type: String,
      enum: ["borrower", "lender", "system"],
      required: true,
    },
    recipientName: {
      type: String,
      required: true,
    },
    recipientEmail: {
      type: String,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["overdue_alert", "payment_receipt", "general"],
      default: "overdue_alert",
    },
    repaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repayment",
    },
    amountDue: {
      type: Number,
    },
    dueDate: {
      type: Date,
    },
    isOverdue: {
      type: Boolean,
      default: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
