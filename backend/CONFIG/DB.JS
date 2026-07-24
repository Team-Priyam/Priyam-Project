const mongoose = require("mongoose");

const connectDB = async () => {
  const primaryURI = process.env.MONGO_URI;
  const fallbackURI =
    process.env.LOCAL_MONGO_URI || "mongodb://127.0.0.1:27017/rural_microfinance";

  // Mongoose connection event listeners
  mongoose.connection.on("connected", () => {
    console.log("MongoDB Connected Successfully");
  });

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB Connection Error:", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB Disconnected. Attempting reconnection...");
  });

  try {
    if (primaryURI) {
      console.log("Connecting to primary MongoDB URI...");
      await mongoose.connect(primaryURI, {
        serverSelectionTimeoutMS: 5000,
      });
      return;
    }
  } catch (error) {
    console.error("Primary MongoDB Connection Failed:", error.message);
    console.log("Attempting fallback connection to local MongoDB...");
  }

  // Attempt fallback to local MongoDB if primary fails or is missing
  try {
    await mongoose.connect(fallbackURI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`Connected to fallback MongoDB at ${fallbackURI}`);
  } catch (fallbackError) {
    console.error(
      "Fallback MongoDB Connection also failed:",
      fallbackError.message
    );
    console.error(
      "Backend server is running, but database connection is unavailable."
    );
    // Note: Do NOT process.exit(1) here so backend server stays alive!
  }
};

module.exports = connectDB;