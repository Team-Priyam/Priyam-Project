import express from "express";
import Borrower from "../models/Borrower.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

/**
 * Helper function to escape special characters for regex queries
 */
const escapeRegex = (text) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * @route   GET /api/borrowers/villages
 * @desc    Get distinct list of villages/locations for filter dropdown
 * @access  Private (Authorized users only)
 */
router.get("/villages", protect, async (req, res) => {
  try {
    const villages = await Borrower.distinct("village");
    res.json({
      success: true,
      villages: villages.sort(),
    });
  } catch (error) {
    console.error("Fetch villages error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching village locations",
    });
  }
});

/**
 * @route   GET /api/borrowers
 * @desc    Get paginated list of borrowers with search & village filter capabilities
 * @access  Private (Authorized users only)
 */
router.get("/", protect, async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "", village = "", location = "" } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));

    // Build filter query object
    const query = {};

    if (search.trim()) {
      const sanitizedSearch = escapeRegex(search.trim());
      query.name = { $regex: sanitizedSearch, $options: "i" };
    }

    const selectedLocation = (village || location).trim();
    if (selectedLocation) {
      const sanitizedVillage = escapeRegex(selectedLocation);
      query.village = { $regex: `^${sanitizedVillage}$`, $options: "i" };
    }

    // Auto-seed sample borrower data if collection is completely empty
    const totalCountInDb = await Borrower.countDocuments();
    if (totalCountInDb === 0) {
      const sampleBorrowers = [
        { name: "Ramesh Sharma", village: "Rampur", contactNumber: "+91 98765 43210", aadhaarNumber: "XXXX-XXXX-1234", occupation: "Agriculture", totalLoans: 2, totalBorrowed: 45000, status: "active" },
        { name: "Sita Devi", village: "Kishanpur", contactNumber: "+91 98765 43211", aadhaarNumber: "XXXX-XXXX-2345", occupation: "Handicrafts", totalLoans: 1, totalBorrowed: 20000, status: "active" },
        { name: "Sunita Devi", village: "Rampur", contactNumber: "+91 98765 43212", aadhaarNumber: "XXXX-XXXX-3456", occupation: "Dairy Farming", totalLoans: 3, totalBorrowed: 75000, status: "active" },
        { name: "Vikram Singh", village: "Sundarpur", contactNumber: "+91 98765 43213", aadhaarNumber: "XXXX-XXXX-4567", occupation: "Small Business", totalLoans: 1, totalBorrowed: 30000, status: "active" },
        { name: "Anita Kumari", village: "Kishanpur", contactNumber: "+91 98765 43214", aadhaarNumber: "XXXX-XXXX-5678", occupation: "Tailoring", totalLoans: 2, totalBorrowed: 35000, status: "active" },
        { name: "Manohar Lal", village: "Bishnupur", contactNumber: "+91 98765 43215", aadhaarNumber: "XXXX-XXXX-6789", occupation: "Agriculture", totalLoans: 1, totalBorrowed: 50000, status: "active" },
        { name: "Pooja Sharma", village: "Sundarpur", contactNumber: "+91 98765 43216", aadhaarNumber: "XXXX-XXXX-7890", occupation: "Poultry Farm", totalLoans: 2, totalBorrowed: 40000, status: "active" },
        { name: "Rajesh Kumar", village: "Rampur", contactNumber: "+91 98765 43217", aadhaarNumber: "XXXX-XXXX-8901", occupation: "Grocery Shop", totalLoans: 4, totalBorrowed: 120000, status: "active" },
        { name: "Geeta Verma", village: "Bishnupur", contactNumber: "+91 98765 43218", aadhaarNumber: "XXXX-XXXX-9012", occupation: "Dairy Farming", totalLoans: 1, totalBorrowed: 25000, status: "active" },
        { name: "Harish Chandra", village: "Kishanpur", contactNumber: "+91 98765 43219", aadhaarNumber: "XXXX-XXXX-0123", occupation: "Carpentry", totalLoans: 2, totalBorrowed: 60000, status: "active" },
        { name: "Kavita Singh", village: "Sundarpur", contactNumber: "+91 98765 43220", aadhaarNumber: "XXXX-XXXX-1122", occupation: "Weaving", totalLoans: 1, totalBorrowed: 15000, status: "active" },
        { name: "Dinesh Yadav", village: "Bishnupur", contactNumber: "+91 98765 43221", aadhaarNumber: "XXXX-XXXX-3344", occupation: "Fishery", totalLoans: 3, totalBorrowed: 85000, status: "active" },
      ];
      await Borrower.insertMany(sampleBorrowers);
    }

    const total = await Borrower.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum) || 1;

    // Normalize page number if it exceeds total pages
    const validPage = Math.min(pageNum, totalPages);

    const borrowers = await Borrower.find(query)
      .sort({ createdAt: -1 })
      .skip((validPage - 1) * limitNum)
      .limit(limitNum);

    res.json({
      success: true,
      count: borrowers.length,
      total,
      totalPages,
      currentPage: validPage,
      limit: limitNum,
      borrowers,
    });
  } catch (error) {
    console.error("Fetch borrowers error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching borrower profiles",
    });
  }
});

/**
 * @route   POST /api/borrowers
 * @desc    Create a new borrower profile
 * @access  Private (Authorized users only)
 */
router.post("/", protect, async (req, res) => {
  try {
    const { name, village, contactNumber, aadhaarNumber, occupation, status } = req.body;

    if (!name || !name.trim() || !village || !village.trim()) {
      return res.status(400).json({
        success: false,
        message: "Borrower name and village/location are required",
      });
    }

    const newBorrower = await Borrower.create({
      name: name.trim(),
      village: village.trim(),
      contactNumber: contactNumber ? contactNumber.trim() : "",
      aadhaarNumber: aadhaarNumber ? aadhaarNumber.trim() : "",
      occupation: occupation ? occupation.trim() : "Farmer",
      status: status || "active",
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Borrower profile created successfully",
      borrower: newBorrower,
    });
  } catch (error) {
    console.error("Create borrower profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating borrower profile",
    });
  }
});

export default router;
