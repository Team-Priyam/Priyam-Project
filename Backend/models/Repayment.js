import mongoose from "mongoose";

const repaymentSchema = new mongoose.Schema(
  {
    borrower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Borrower",
      required: [true, "Borrower reference ID is required"],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Repayment amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Bank Transfer", "Cheque"],
      default: "Cash",
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    note: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying a borrower's repayments sorted by date descending
repaymentSchema.index({ borrower: 1, date: -1 });

const Repayment = mongoose.model("Repayment", repaymentSchema);

export default Repayment;
