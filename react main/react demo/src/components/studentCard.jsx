const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

const connectDB = require("./config/db");
const User = require("./models/User");

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Home Route
app.get("/", (req, res) => {
res.send("Server Running...");
});

// Create User
app.post("/user", async (req, res) => {
 try {
 const { name, email, age } = req.body;

 const newUser = new User({
 name,
 email,
 age,
 });

 await newUser.save();

res.status(201).json({
 success: true,
 message: "User Saved Successfully",
 data: newUser,
 });
 } catch (err) {
res.status(500).json({
 success: false,
 message: err.message,
 });
 }
});

// Get All Users
app.get("/users", async (req, res) => {
 try {
 const users = await User.find();

res.json(users);
 } catch (err) {
res.status(500).json({
 message: err.message,
 });
 }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
 console.log(`✅ Server Running On Port ${PORT}`);
});