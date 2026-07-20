import mongoose from "mongoose";

const borrowerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Borrower name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters long"]
    },
    contact: {
      type: String,
      required: [true, "Contact number is required"],
      unique: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number starting with 6-9"]
    },
    address: {
      type: String,
      required: [true, "Residential address is required"],
      trim: true,
      minlength: [8, "Address must be at least 8 characters long"]
    },
    idProof: {
      type: {
        type: String,
        required: [true, "ID Proof type is required"],
        enum: {
          values: ["Aadhaar Card", "Voter ID", "PAN Card", "Ration Card", "Driving License"],
          message: "{VALUE} is not a valid ID type"
        }
      },
      number: {
        type: String,
        required: [true, "ID Proof number is required"],
        unique: true,
        trim: true,
        uppercase: true
      }
    }
  },
  {
    timestamps: true
  }
);

// Helper method or schema index to ensure ID proof lookup is fast
borrowerSchema.index({ "idProof.number": 1 }, { unique: true });

const Borrower = mongoose.model("Borrower", borrowerSchema);

export default Borrower;
