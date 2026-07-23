const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/User");

dotenv.config();

/**
 * Migration function to update existing users lacking a 'role' field
 * @param {Object} [userModel] Optional User model override for testing
 * @param {String} [defaultRole] Default role to assign (defaults to 'Lender')
 */
const migrateUserRoles = async (userModel = User, defaultRole = "Lender") => {
  console.log("--------------------------------------------------");
  console.log("Starting User Roles Database Migration...");
  console.log("--------------------------------------------------");

  try {
    // Find all users where role field is missing, null, or invalid
    const filter = {
      $or: [
        { role: { $exists: false } },
        { role: null },
        { role: "" },
        { role: { $nin: Object.values(User.ROLES || ["Lender", "LoanOfficer", "Admin"]) } },
      ],
    };

    const countToUpdate = await userModel.countDocuments(filter);
    console.log(`Found ${countToUpdate} user(s) requiring role migration.`);

    if (countToUpdate === 0) {
      console.log("No user records require role migration. Database is up to date.");
      return { matchedCount: 0, modifiedCount: 0 };
    }

    const result = await userModel.updateMany(filter, {
      $set: { role: defaultRole },
    });

    console.log(`Migration completed successfully.`);
    console.log(`Matched: ${result.matchedCount || countToUpdate}, Modified: ${result.modifiedCount || countToUpdate}`);
    return result;
  } catch (error) {
    console.error("Migration error:", error.message);
    throw error;
  }
};

// Execute script if run directly from CLI
if (require.main === module) {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/rural_microfinance";

  mongoose
    .connect(mongoUri)
    .then(async () => {
      console.log("Connected to MongoDB for migration execution.");
      await migrateUserRoles();
      await mongoose.disconnect();
      console.log("MongoDB connection closed.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Failed to connect to MongoDB:", err.message);
      process.exit(1);
    });
}

module.exports = { migrateUserRoles };
