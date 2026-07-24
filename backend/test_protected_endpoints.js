const express = require("express");
const http = require("http");
const jwt = require("jsonwebtoken");
const usersRouter = require("./routes/users");
const User = require("./models/User");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey_rural_microfinance_2026";

let passedTests = 0;
let failedTests = 0;

const assert = (condition, testName, details = "") => {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testName} ${details ? "- " + JSON.stringify(details) : ""}`);
    failedTests++;
  }
};

const runEndpointRoleTests = async () => {
  console.log("==================================================");
  console.log("  RUNNING PROTECTED ENDPOINTS ROLE ACCESS TESTS");
  console.log("==================================================\n");

  // Setup Express app instance for real HTTP testing
  const app = express();
  app.use(express.json());
  app.use("/api/users", usersRouter);

  // Mock User.findById to return mock users based on token id
  User.findById = (id) => ({
    select: () => {
      if (id.includes("lender")) {
        return Promise.resolve({ _id: id, name: "Lender User", role: "Lender" });
      } else if (id.includes("officer")) {
        return Promise.resolve({ _id: id, name: "Officer User", role: "LoanOfficer" });
      } else if (id.includes("admin")) {
        return Promise.resolve({ _id: id, name: "Admin User", role: "Admin" });
      }
      return Promise.resolve(null);
    },
  });

  // Start HTTP server on dynamic port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const fetchEndpoint = async (path, token = null) => {
    const headers = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${path}`, { headers });
    const data = await response.json();
    return { status: response.status, body: data };
  };

  try {
    // Generate tokens for testing
    const lenderToken = jwt.sign({ id: "user_lender_101", role: "Lender" }, JWT_SECRET);
    const officerToken = jwt.sign({ id: "user_officer_202", role: "LoanOfficer" }, JWT_SECRET);
    const adminToken = jwt.sign({ id: "user_admin_303", role: "Admin" }, JWT_SECRET);

    // --- Suite 1: Unauthenticated Requests (No Token -> 401) ---
    {
      const resLenderDash = await fetchEndpoint("/api/users/lender-dashboard");
      assert(resLenderDash.status === 401, "Unauthenticated access to lender-dashboard returns 401 Unauthorized");

      const resOfficerDash = await fetchEndpoint("/api/users/loanofficer-dashboard");
      assert(resOfficerDash.status === 401, "Unauthenticated access to loanofficer-dashboard returns 401 Unauthorized");
    }

    // --- Suite 2: Access Control with Lender Role ---
    {
      const resLenderDash = await fetchEndpoint("/api/users/lender-dashboard", lenderToken);
      assert(resLenderDash.status === 200, "Lender token granted access (200) to /lender-dashboard");

      const resOfficerDash = await fetchEndpoint("/api/users/loanofficer-dashboard", lenderToken);
      assert(resOfficerDash.status === 403, "Lender token denied access (403) to /loanofficer-dashboard");

      const resAdminPanel = await fetchEndpoint("/api/users/admin-panel", lenderToken);
      assert(resAdminPanel.status === 403, "Lender token denied access (403) to /admin-panel");

      const resSharedOps = await fetchEndpoint("/api/users/shared-field-ops", lenderToken);
      assert(resSharedOps.status === 200, "Lender token granted access (200) to /shared-field-ops");
    }

    // --- Suite 3: Access Control with LoanOfficer Role ---
    {
      const resLenderDash = await fetchEndpoint("/api/users/lender-dashboard", officerToken);
      assert(resLenderDash.status === 403, "LoanOfficer token denied access (403) to /lender-dashboard");

      const resOfficerDash = await fetchEndpoint("/api/users/loanofficer-dashboard", officerToken);
      assert(resOfficerDash.status === 200, "LoanOfficer token granted access (200) to /loanofficer-dashboard");

      const resAdminPanel = await fetchEndpoint("/api/users/admin-panel", officerToken);
      assert(resAdminPanel.status === 403, "LoanOfficer token denied access (403) to /admin-panel");

      const resSharedOps = await fetchEndpoint("/api/users/shared-field-ops", officerToken);
      assert(resSharedOps.status === 200, "LoanOfficer token granted access (200) to /shared-field-ops");
    }

    // --- Suite 4: Access Control with Admin Role ---
    {
      const resLenderDash = await fetchEndpoint("/api/users/lender-dashboard", adminToken);
      assert(resLenderDash.status === 200, "Admin token granted access (200) to /lender-dashboard");

      const resOfficerDash = await fetchEndpoint("/api/users/loanofficer-dashboard", adminToken);
      assert(resOfficerDash.status === 200, "Admin token granted access (200) to /loanofficer-dashboard");

      const resAdminPanel = await fetchEndpoint("/api/users/admin-panel", adminToken);
      assert(resAdminPanel.status === 200, "Admin token granted access (200) to /admin-panel");
    }

    console.log("\n==================================================");
    console.log(`  TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log("==================================================");
  } finally {
    server.close();
  }

  if (failedTests > 0) {
    process.exit(1);
  }
};

runEndpointRoleTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
