const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./CONFIG/DB.JS");

dotenv.config();

connectDB();
const app = express();

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

const usersRouter = require("./routes/users");
app.use("/api/users", usersRouter);

app.get("/", (req, res) => {
  res.json({ message: "Rural Microfinance API is active" });
});

// catch 404
app.use((req, res, next) => {
  res.status(404).json({ message: "Route Not Found" });
});

// error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    error: req.app.get("env") === "development" ? err : {},
  });
});

module.exports = app;
