const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const runTests = async () => {
  console.log("=== RUNNING BACKEND PROFILE ROUTE TESTS ===");

  const User = require("./models/User");
  const { updateUserProfile } = require("./controllers/userController");

  // Create mock user object
  const hashedPassword = await bcrypt.hash("Password123", 10);
  const mockUser = {
    _id: "60d5ecb8b5c9c22b1c8c1001",
    name: "Ramesh Lender",
    email: "ramesh@microfinance.org",
    password: hashedPassword,
    role: "Lender",
    village: "Central Village",
    phone: "+91 98765 43210",
    save: async function () {
      return this;
    },
  };

  // Mock User.findById
  User.findById = (id) => Promise.resolve(mockUser);

  // Test 1: Require current password when changing password
  const req1 = {
    user: { _id: mockUser._id },
    body: { newPassword: "NewSecurePassword123" }
  };
  let resCode1, resBody1;
  const res1 = {
    status: (code) => { resCode1 = code; return res1; },
    json: (data) => { resBody1 = data; }
  };
  await updateUserProfile(req1, res1);
  console.log("Test 1 (Missing current password):", resCode1 === 400 ? "PASSED" : "FAILED", resBody1);

  // Test 2: Invalid current password
  const req2 = {
    user: { _id: mockUser._id },
    body: { currentPassword: "WrongPassword", newPassword: "NewSecurePassword123" }
  };
  let resCode2, resBody2;
  const res2 = {
    status: (code) => { resCode2 = code; return res2; },
    json: (data) => { resBody2 = data; }
  };
  await updateUserProfile(req2, res2);
  console.log("Test 2 (Invalid current password):", resCode2 === 400 ? "PASSED" : "FAILED", resBody2);

  // Test 3: Valid current password & name update
  const req3 = {
    user: { _id: mockUser._id },
    body: { name: "Ramesh Sharma Updated", currentPassword: "Password123", newPassword: "NewSecurePassword123" }
  };
  let resCode3, resBody3;
  const res3 = {
    status: (code) => { resCode3 = code; return res3; },
    json: (data) => { resBody3 = data; }
  };
  await updateUserProfile(req3, res3);
  console.log("Test 3 (Valid update):", (resBody3 && resBody3.name === "Ramesh Sharma Updated") ? "PASSED" : "FAILED", resBody3);

  console.log("=== ALL ENDPOINT TESTS EXECUTED SUCCESSFULLY ===");
};

runTests().catch(console.error);
