import mongoose from "mongoose";

const loanSchema = new mongoose.Schema(
  {
    borrower: {
      type: String,
      required: [true, "Borrower name is required"],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, "Loan amount is required"],
      min: [1, "Amount must be greater than 0"],
    },
    term: {
      type: Number,
      required: [true, "Loan term is required"],
      min: [1, "Term must be at least 1 month"],
    },
    purpose: {
      type: String,
      required: [true, "Loan purpose is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    statusHistory: [
      {
        status: {
          type: String,
          required: true,
        },
        action: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        user: {
          type: String,
          default: "System/Officer",
        },
        note: {
          type: String,
          default: "",
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Loan = mongoose.model("Loan", loanSchema);

export default Loan;
