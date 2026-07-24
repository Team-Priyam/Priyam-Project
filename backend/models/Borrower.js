const mongoose = require("mongoose");

const borrowerSchema = new mongoose.Schema(
  {
    borrowerCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Borrower name is required"],
      trim: true,
    },
    photoUrl: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    secondaryPhone: {
      type: String,
      default: null,
      trim: true,
    },
    village: {
      type: String,
      default: null,
      trim: true,
    },
    address: {
      type: String,
      default: null,
      trim: true,
    },
    kycType: {
      type: String,
      default: "Aadhaar Card",
    },
    kycNumber: {
      type: String,
      default: null,
    },
    kycVerified: {
      type: Boolean,
      default: false,
    },
    occupation: {
      type: String,
      default: null,
    },
    joinedDate: {
      type: Date,
      default: Date.now,
    },
    emergencyContact: {
      type: String,
      default: null,
    },
    financials: {
      totalBorrowed: { type: Number, default: 0 },
      totalRepaid: { type: Number, default: 0 },
      currentBalance: { type: Number, default: 0 },
      activeLoansCount: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ["Active", "Overdue", "Cleared"],
        default: "Active",
      },
    },
    activities: [
      {
        id: { type: String },
        type: { type: String, required: true },
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        mode: { type: String, default: "Cash" },
        receiptNo: { type: String },
        status: { type: String, default: "Completed" },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Borrower", borrowerSchema);
