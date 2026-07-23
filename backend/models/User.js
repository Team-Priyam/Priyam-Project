const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const ROLES = {
  LENDER: "Lender",
  LOAN_OFFICER: "LoanOfficer",
  ADMIN: "Admin",
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.LENDER,
      required: [true, "Role is required"],
    },
    village: {
      type: String,
      default: "Central Village",
    },
    phone: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Match user password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model("User", userSchema);
User.ROLES = ROLES;
module.exports = User;
