import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: String,
      default: "all", // "all", or specific user email/ID/role
    },
    borrower: {
      type: String,
      required: true,
      trim: true,
    },
    borrowerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Borrower",
      default: null,
    },
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Loan",
      default: null,
    },
    eventType: {
      type: String,
      enum: ["overdue", "repayment", "application", "system"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    meta: {
      amount: { type: Number, default: 0 },
      dueDate: { type: Date, default: null },
      status: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
