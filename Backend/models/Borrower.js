import mongoose from "mongoose";

const borrowerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Borrower name is required"],
      trim: true,
      index: true,
    },
    village: {
      type: String,
      required: [true, "Village/Location is required"],
      trim: true,
      index: true,
    },
    contactNumber: {
      type: String,
      trim: true,
      default: "",
    },
    aadhaarNumber: {
      type: String,
      trim: true,
      default: "",
    },
    occupation: {
      type: String,
      trim: true,
      default: "Farmer",
    },
    totalLoans: {
      type: Number,
      default: 0,
      min: [0, "Total loans cannot be negative"],
    },
    totalBorrowed: {
      type: Number,
      default: 0,
      min: [0, "Total borrowed amount cannot be negative"],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    auditTrail: [
      {
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        updatedByName: {
          type: String,
          default: "System User",
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        updatedFields: [String],
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index for optimized search & village filter queries
borrowerSchema.index({ name: 1, village: 1 });

const Borrower = mongoose.model("Borrower", borrowerSchema);

export default Borrower;
