const jwt = require("jsonwebtoken");
const { protect, authorize } = require("./middleware/auth");
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

const runRoleMiddlewareTests = async () => {
  console.log("==================================================");
  console.log("  RUNNING BACKEND ROLE MIDDLEWARE UNIT TESTS");
  console.log("==================================================\n");

  // Helper to create mock req, res, next
  const createMockReqRes = (headers = {}, user = null, tokenData = null) => {
    let statusCode = 200;
    let jsonBody = null;

    const req = {
      headers,
      user,
      tokenData,
    };

    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        jsonBody = data;
        return res;
      },
    };

    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    return { req, res, next, getStatus: () => statusCode, getBody: () => jsonBody, isNextCalled: () => nextCalled };
  };

  // --- Test 1: Extract Role from JWT Token ---
  const lenderToken = jwt.sign({ id: "user_lender_123", role: "Lender" }, JWT_SECRET);
  const decodedLender = jwt.verify(lenderToken, JWT_SECRET);
  assert(decodedLender.role === "Lender", "JWT Token includes and extracts Lender role correctly");

  const officerToken = jwt.sign({ id: "user_officer_456", role: "LoanOfficer" }, JWT_SECRET);
  const decodedOfficer = jwt.verify(officerToken, JWT_SECRET);
  assert(decodedOfficer.role === "LoanOfficer", "JWT Token includes and extracts LoanOfficer role correctly");

  // --- Test 2: Allow access when user role matches allowed roles (Lender -> Lender route) ---
  {
    const middleware = authorize("Lender");
    const { req, res, next, isNextCalled } = createMockReqRes({}, null, { id: "123", role: "Lender" });
    middleware(req, res, next);
    assert(isNextCalled(), "Authorize middleware permits Lender access to Lender endpoint");
  }

  // --- Test 3: Deny access and return 403 status when user role does NOT match ---
  {
    const middleware = authorize("Lender");
    const { req, res, next, getStatus, getBody, isNextCalled } = createMockReqRes({}, null, { id: "456", role: "LoanOfficer" });
    middleware(req, res, next);
    assert(!isNextCalled(), "Authorize middleware stops execution for unauthorized role");
    assert(getStatus() === 403, "Unauthorized access returns HTTP 403 status code");
    assert(getBody() && getBody().message.includes("Forbidden"), "403 response contains forbidden error message", getBody());
  }

  // --- Test 4: Support multiple allowed roles (e.g. Lender or LoanOfficer) ---
  {
    const middleware = authorize("Lender", "LoanOfficer");

    const mockLender = createMockReqRes({}, null, { id: "123", role: "Lender" });
    middleware(mockLender.req, mockLender.res, mockLender.next);

    const mockOfficer = createMockReqRes({}, null, { id: "456", role: "LoanOfficer" });
    middleware(mockOfficer.req, mockOfficer.res, mockOfficer.next);

    const mockAdmin = createMockReqRes({}, null, { id: "789", role: "Admin" });
    middleware(mockAdmin.req, mockAdmin.res, mockAdmin.next);

    assert(mockLender.isNextCalled(), "Multi-role authorize permits Lender");
    assert(mockOfficer.isNextCalled(), "Multi-role authorize permits LoanOfficer");
    assert(!mockAdmin.isNextCalled() && mockAdmin.getStatus() === 403, "Multi-role authorize denies unlisted role with 403");
  }

  // --- Test 5: Role matching with req.user object fallback ---
  {
    const middleware = authorize("LoanOfficer");
    const { req, res, next, isNextCalled } = createMockReqRes({}, { _id: "456", role: "LoanOfficer" });
    middleware(req, res, next);
    assert(isNextCalled(), "Authorize middleware works when role is attached to req.user");
  }

  // --- Test 6: Case-insensitive & normalized role checking ---
  {
    const middleware = authorize("Lender", "Loan Officer");
    const { req: req1, res: res1, next: next1, isNextCalled: isNext1 } = createMockReqRes({}, null, { role: "lender" });
    middleware(req1, res1, next1);

    const { req: req2, res: res2, next: next2, isNextCalled: isNext2 } = createMockReqRes({}, null, { role: "LoanOfficer" });
    middleware(req2, res2, next2);

    assert(isNext1(), "Normalizes 'lender' to match 'Lender'");
    assert(isNext2(), "Normalizes 'LoanOfficer' to match 'Loan Officer'");
  }

  // --- Test 7: Deny access with 403 when no role is attached to request ---
  {
    const middleware = authorize("Lender");
    const { req, res, next, getStatus, getBody, isNextCalled } = createMockReqRes({}, null, null);
    middleware(req, res, next);
    assert(!isNextCalled(), "Authorize middleware stops execution when role is missing");
    assert(getStatus() === 403, "Missing role returns 403 error status");
  }

  // --- Test 8: End-to-End Protect + Authorize Middleware Flow ---
  {
    // Mock User.findById
    User.findById = (id) => ({
      select: () => Promise.resolve({ _id: id, name: "Officer User", role: "LoanOfficer" })
    });

    const token = jwt.sign({ id: "officer_999", role: "LoanOfficer" }, JWT_SECRET);
    const headers = { authorization: `Bearer ${token}` };

    const { req, res, next: protectNext, isNextCalled: isProtectNext } = createMockReqRes(headers);

    await protect(req, res, protectNext);
    assert(isProtectNext(), "Protect middleware successfully authenticates valid token");
    assert(req.tokenData && req.tokenData.role === "LoanOfficer", "Protect middleware attaches decoded token role");

    // LoanOfficer attempting Lender-only route -> expect 403
    const lenderMiddleware = authorize("Lender");
    const lenderRes = createMockReqRes(headers, req.user, req.tokenData);
    lenderMiddleware(req, lenderRes.res, lenderRes.next);
    assert(lenderRes.getStatus() === 403, "LoanOfficer denied access to Lender-only route with 403");

    // LoanOfficer attempting LoanOfficer-only route -> expect allowed
    const officerMiddleware = authorize("LoanOfficer");
    const officerRes = createMockReqRes(headers, req.user, req.tokenData);
    officerMiddleware(req, officerRes.res, officerRes.next);
    assert(officerRes.isNextCalled(), "LoanOfficer granted access to LoanOfficer endpoint");
  }

  // --- Test 9: Verify convenience role middleware helpers ---
  {
    const { requireLender, requireLoanOfficer, requireAdmin, checkRole } = require("./middleware/auth");
    
    assert(typeof requireLender === "function", "requireLender helper middleware exists");
    assert(typeof requireLoanOfficer === "function", "requireLoanOfficer helper middleware exists");
    assert(typeof requireAdmin === "function", "requireAdmin helper middleware exists");
    assert(typeof checkRole === "function", "checkRole alias helper middleware exists");

    const mockOfficerReq = createMockReqRes({}, null, { role: "LoanOfficer" });
    requireLoanOfficer(mockOfficerReq.req, mockOfficerReq.res, mockOfficerReq.next);
    assert(mockOfficerReq.isNextCalled(), "requireLoanOfficer permits LoanOfficer role");

    const mockLenderReq = createMockReqRes({}, null, { role: "LoanOfficer" });
    requireLender(mockLenderReq.req, mockLenderReq.res, mockLenderReq.next);
    assert(mockLenderReq.getStatus() === 403, "requireLender denies LoanOfficer role with 403");
  }

  console.log("\n==================================================");
  console.log(`  TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log("==================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
};

runRoleMiddlewareTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
