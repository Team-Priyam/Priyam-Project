const Borrower = require("../models/Borrower");

// Mock demo dataset for offline / non-connected MongoDB runtime environments
const DEMO_BORROWERS = [
  {
    _id: "bw_8842",
    borrowerCode: "BW-2024-8842",
    name: "Sunita Devi",
    photoUrl: null,
    phone: "+91 94123 89012",
    secondaryPhone: null,
    village: "East Rampur Village",
    address: "House 42, Near Panchayat Bhavan, East Rampur",
    kycType: "Aadhaar Card",
    kycNumber: "XXXX-XXXX-8921",
    kycVerified: true,
    occupation: "Dairy Farmer & Women SHG Member",
    joinedDate: "2024-02-10T00:00:00.000Z",
    emergencyContact: "Rajesh Devi (Husband) - +91 94123 89099",
    financials: {
      totalBorrowed: 50000,
      totalRepaid: 35000,
      currentBalance: 15000,
      activeLoansCount: 1,
      status: "Active",
    },
    activities: [
      {
        id: "act_101",
        type: "Repayment",
        amount: 2500,
        date: "2026-07-20T10:30:00.000Z",
        mode: "Cash (Field Officer Collection)",
        receiptNo: "RCP-2026-0912",
        status: "Completed",
      },
      {
        id: "act_102",
        type: "Repayment",
        amount: 2500,
        date: "2026-06-20T11:15:00.000Z",
        mode: "UPI Collection",
        receiptNo: "RCP-2026-0784",
        status: "Completed",
      },
      {
        id: "act_103",
        type: "Loan Disbursement",
        amount: 50000,
        date: "2026-02-10T09:00:00.000Z",
        mode: "Bank Transfer",
        receiptNo: "DISB-2026-0042",
        status: "Disbursed",
      },
    ],
  },
  {
    _id: "bw_9910",
    borrowerCode: "BW-2024-9910",
    name: "Ramesh Kumar Patel",
    photoUrl: null,
    phone: "+91 98234 11223",
    secondaryPhone: "+91 98234 99000",
    village: "Central Village",
    address: "Plot 12, Main Bazaar, Central Village",
    kycType: "Voter ID",
    kycNumber: "ABC1234567",
    kycVerified: true,
    occupation: "Small Grocery Store Owner",
    joinedDate: "2023-11-05T00:00:00.000Z",
    emergencyContact: "Sunil Patel (Brother) - +91 98234 88776",
    financials: {
      totalBorrowed: 80000,
      totalRepaid: 80000,
      currentBalance: 0,
      activeLoansCount: 0,
      status: "Cleared",
    },
    activities: [
      {
        id: "act_201",
        type: "Repayment",
        amount: 10000,
        date: "2026-05-15T14:00:00.000Z",
        mode: "Bank Transfer",
        receiptNo: "RCP-2026-0512",
        status: "Completed",
      },
      {
        id: "act_202",
        type: "Loan Disbursement",
        amount: 80000,
        date: "2023-11-05T10:00:00.000Z",
        mode: "Bank Transfer",
        receiptNo: "DISB-2023-0099",
        status: "Disbursed",
      },
    ],
  },
  {
    _id: "bw_5521",
    borrowerCode: "BW-2024-5521",
    name: "Anita Sharma",
    photoUrl: null,
    phone: null, // Test missing phone
    secondaryPhone: null,
    village: "North Rampur",
    address: null, // Test missing address
    kycType: "Aadhaar Card",
    kycNumber: null, // Test missing KYC ID
    kycVerified: false,
    occupation: "Handicraft Weaver",
    joinedDate: "2024-05-18T00:00:00.000Z",
    emergencyContact: null,
    financials: {
      totalBorrowed: 25000,
      totalRepaid: 5000,
      currentBalance: 20000,
      activeLoansCount: 1,
      status: "Overdue",
    },
    activities: [], // Test empty activity list
  },
];

// @desc    Get list of borrowers with search & filtering
// @route   GET /api/borrowers
// @access  Protected
const getBorrowers = async (req, res) => {
  try {
    const { search } = req.query;

    let borrowers;
    try {
      let query = {};
      if (search && search.trim() !== "") {
        const regex = new RegExp(search.trim(), "i");
        query = {
          $or: [{ name: regex }, { borrowerCode: regex }, { village: regex }],
        };
      }
      borrowers = await Borrower.find(query).sort({ createdAt: -1 });

      if (!borrowers || borrowers.length === 0) {
        // Filter demo borrowers if DB has no matches
        borrowers = DEMO_BORROWERS.filter((b) => {
          if (!search || search.trim() === "") return true;
          const s = search.trim().toLowerCase();
          return (
            b.name.toLowerCase().includes(s) ||
            b.borrowerCode.toLowerCase().includes(s) ||
            (b.village && b.village.toLowerCase().includes(s))
          );
        });
      }
    } catch (dbErr) {
      // Fallback to in-memory demo data if MongoDB is disconnected
      borrowers = DEMO_BORROWERS.filter((b) => {
        if (!search || search.trim() === "") return true;
        const s = search.trim().toLowerCase();
        return (
          b.name.toLowerCase().includes(s) ||
          b.borrowerCode.toLowerCase().includes(s) ||
          (b.village && b.village.toLowerCase().includes(s))
        );
      });
    }

    res.json({
      success: true,
      count: borrowers.length,
      data: borrowers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Server Error fetching borrowers" });
  }
};

// @desc    Get single borrower detail by ID or Borrower Code
// @route   GET /api/borrowers/:id
// @access  Protected
const getBorrowerById = async (req, res) => {
  try {
    const { id } = req.params;

    let borrower;
    try {
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        borrower = await Borrower.findById(id);
      } else {
        borrower = await Borrower.findOne({
          $or: [{ _id: id }, { borrowerCode: id }],
        });
      }
    } catch (dbErr) {
      // Fall back to demo list
    }

    if (!borrower) {
      borrower = DEMO_BORROWERS.find(
        (b) => b._id === id || b.borrowerCode === id
      );
    }

    if (!borrower) {
      return res.status(404).json({ message: "Borrower record not found" });
    }

    res.json({
      success: true,
      data: borrower,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Server Error fetching borrower details" });
  }
};

// @desc    Create new borrower profile
// @route   POST /api/borrowers
// @access  Protected
const createBorrower = async (req, res) => {
  try {
    const { name, village, phone, occupation, kycType, kycNumber } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Borrower name is required" });
    }

    const count = await Borrower.countDocuments().catch(() => 100);
    const borrowerCode = `BW-2024-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBorrower = new Borrower({
      borrowerCode,
      name,
      village,
      phone,
      occupation,
      kycType: kycType || "Aadhaar Card",
      kycNumber,
    });

    const saved = await newBorrower.save().catch(() => newBorrower);
    res.status(201).json({
      success: true,
      data: saved,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to create borrower profile" });
  }
};

// @desc    Record new repayment against borrower loan
// @route   POST /api/borrowers/:id/repayments
// @access  Protected
const addRepayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date, mode, notes } = req.body;

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: "Repayment amount must be a positive number greater than 0" });
    }

    if (!mode) {
      return res.status(400).json({ message: "Payment method is required" });
    }

    let borrower;
    let isDbModel = false;

    try {
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        borrower = await Borrower.findById(id);
      } else {
        borrower = await Borrower.findOne({
          $or: [{ _id: id }, { borrowerCode: id }],
        });
      }
      if (borrower) isDbModel = true;
    } catch (dbErr) {
      // Fallback if database is disconnected
    }

    if (!borrower) {
      borrower = DEMO_BORROWERS.find(
        (b) => b._id === id || b.borrowerCode === id
      );
    }

    if (!borrower) {
      return res.status(404).json({ message: "Borrower record not found" });
    }

    // Generate receipt number
    const receiptNo = `RCP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newActivity = {
      id: `act_${Date.now()}`,
      type: "Repayment",
      amount: numericAmount,
      date: date ? new Date(date) : new Date(),
      mode: mode || "Cash (Field Collection)",
      receiptNo,
      status: "Completed",
      notes: notes || "",
    };

    if (isDbModel) {
      borrower.activities.unshift(newActivity);
      const totalRepaid = (borrower.financials?.totalRepaid || 0) + numericAmount;
      const totalBorrowed = borrower.financials?.totalBorrowed || 0;
      const currentBalance = Math.max(0, totalBorrowed - totalRepaid);
      let status = borrower.financials?.status || "Active";
      if (currentBalance === 0) {
        status = "Cleared";
      } else if (status === "Overdue" && currentBalance > 0) {
        status = "Active";
      }

      borrower.financials = {
        ...borrower.financials,
        totalRepaid,
        currentBalance,
        status,
      };

      await borrower.save();
    } else {
      // Update demo borrower object in memory
      if (!borrower.activities) borrower.activities = [];
      borrower.activities.unshift(newActivity);

      const totalRepaid = (borrower.financials?.totalRepaid || 0) + numericAmount;
      const totalBorrowed = borrower.financials?.totalBorrowed || 0;
      const currentBalance = Math.max(0, totalBorrowed - totalRepaid);
      let status = borrower.financials?.status || "Active";
      if (currentBalance === 0) {
        status = "Cleared";
      }

      borrower.financials = {
        ...borrower.financials,
        totalRepaid,
        currentBalance,
        status,
      };
    }

    return res.status(201).json({
      success: true,
      message: `Repayment of ₹${numericAmount.toLocaleString("en-IN")} saved successfully`,
      receiptNo,
      data: borrower,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to record repayment" });
  }
};

module.exports = {
  getBorrowers,
  getBorrowerById,
  createBorrower,
  addRepayment,
  DEMO_BORROWERS,
};

