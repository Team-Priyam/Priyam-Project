import mongoose from "mongoose";

const repaymentSchema = new mongoose.Schema(
  {
    borrower: {
      type: String,
      required: [true, "Borrower name is required"],
      trim: true,
    },
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Loan",
    },
    amountDue: {
      type: Number,
      required: [true, "Amount due is required"],
      min: [0, "Amount due must be non-negative"],
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },
    status: {
      type: String,
      enum: ["unpaid", "paid", "overdue"],
      default: "unpaid",
    },
    paidAt: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      default: "Bank Transfer / Cash",
    },
    overdueNotified: {
      type: Boolean,
      default: false,
    },
    overdueNotifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient upcoming 7-day query filtering
repaymentSchema.index({ dueDate: 1, status: 1 });

const Repayment = mongoose.model("Repayment", repaymentSchema);

export default Repayment;
