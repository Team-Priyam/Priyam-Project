import express from "express";
import Borrower from "../models/Borrower.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

/**
 * @route   POST /api/borrowers
 * @desc    Register a new borrower profile
 * @access  Private (Authorized users)
 */
router.post("/", protect, async (req, res) => {
  const { name, contact, address, idProof } = req.body;

  // 1. Basic field presence checks
  if (!name || !contact || !address || !idProof) {
    return res.status(400).json({
      success: false,
      message: "Please fill out all required fields: name, contact, address, and idProof",
    });
  }

  const { type, number } = idProof;
  if (!type || !number) {
    return res.status(400).json({
      success: false,
      message: "idProof must contain both type and number",
    });
  }

  // 2. Character length and format validation
  if (name.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: "Borrower name must be at least 3 characters long",
    });
  }

  const contactStr = contact.trim();
  if (!/^[6-9]\d{9}$/.test(contactStr)) {
    return res.status(400).json({
      success: false,
      message: "Contact number must be a valid 10-digit mobile number starting with 6-9",
    });
  }

  if (address.trim().length < 8) {
    return res.status(400).json({
      success: false,
      message: "Address must be at least 8 characters long to be detailed",
    });
  }

  const validIdTypes = ["Aadhaar Card", "Voter ID", "PAN Card", "Ration Card", "Driving License"];
  if (!validIdTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      message: `Invalid ID Proof type. Must be one of: ${validIdTypes.join(", ")}`,
    });
  }

  const numberStr = number.trim().toUpperCase();
  if (type === "Aadhaar Card" && !/^\d{12}$/.test(numberStr)) {
    return res.status(400).json({
      success: false,
      message: "Aadhaar Card number must be exactly 12 digits",
    });
  }

  if (type === "PAN Card" && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(numberStr)) {
    return res.status(400).json({
      success: false,
      message: "Invalid PAN Card format (e.g. ABCDE1234F)",
    });
  }

  if (numberStr.length < 5) {
    return res.status(400).json({
      success: false,
      message: "ID Proof number must be at least 5 characters long",
    });
  }

  try {
    // 3. Proactively prevent duplicates
    const existingContact = await Borrower.findOne({ contact: contactStr });
    if (existingContact) {
      return res.status(400).json({
        success: false,
        message: `A borrower with mobile number "${contactStr}" is already registered.`,
      });
    }

    const existingId = await Borrower.findOne({ "idProof.number": numberStr });
    if (existingId) {
      return res.status(400).json({
        success: false,
        message: `A borrower with ID number "${numberStr}" is already registered.`,
      });
    }

    // 4. Save to Database
    const newBorrower = await Borrower.create({
      name: name.trim(),
      contact: contactStr,
      address: address.trim(),
      idProof: {
        type,
        number: numberStr,
      },
    });

    res.status(201).json({
      success: true,
      message: "Borrower profile registered successfully",
      borrower: newBorrower,
    });
  } catch (error) {
    console.error("Create borrower error:", error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate value error: A borrower with this contact or ID proof number is already registered.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error registering borrower profile. Please try again later.",
    });
  }
});

/**
 * @route   GET /api/borrowers
 * @desc    Get all registered borrower profiles list
 * @access  Private (Authorized users)
 */
router.get("/", protect, async (req, res) => {
  try {
    const borrowers = await Borrower.find({}).sort({ createdAt: -1 });
    res.json({
      success: true,
      borrowers,
    });
  } catch (error) {
    console.error("Fetch borrowers error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching borrower profiles list",
    });
  }
});

export default router;
