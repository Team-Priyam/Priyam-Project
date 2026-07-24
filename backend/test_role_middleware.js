const jwt = require("jsonwebtoken");
const {
  protect,
  authorize,
  checkRole,
  requireLender,
  requireLoanOfficer,
  requireAdmin,
} = require("./middleware/auth");
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

// Mock express req, res, next builder
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

const runMiddlewareUnitTestSuite = async () => {
  console.log("==================================================");
  console.log("  ROLE MIDDLEWARE UNIT TEST SUITE: ACCESS CONTROL");
  console.log("==================================================\n");

  // ==================================================
  // CATEGORY 1: ALLOWED ACCESS CASES
  // ==================================================
  console.log("--- 1. ALLOWED ACCESS CASES ---");

  // Test 1.1: Allowed access when JWT role matches single target role (Lender -> Lender)
  {
    const middleware = authorize("Lender");
    const mock = createMockReqRes({}, null, { id: "u1", role: "Lender" });
    middleware(mock.req, mock.res, mock.next);
    assert(mock.isNextCalled(), "[ALLOWED] Permits 'Lender' access to Lender-protected endpoint");
  }

  // Test 1.2: Allowed access when JWT role matches single target role (LoanOfficer -> LoanOfficer)
  {
    const middleware = authorize("LoanOfficer");
    const mock = createMockReqRes({}, null, { id: "u2", role: "LoanOfficer" });
    middleware(mock.req, mock.res, mock.next);
    assert(mock.isNextCalled(), "[ALLOWED] Permits 'LoanOfficer' access to LoanOfficer-protected endpoint");
  }

  // Test 1.3: Allowed access when user role is in multi-role whitelist (Lender or LoanOfficer)
  {
    const middleware = authorize("Lender", "LoanOfficer");
    const mockLender = createMockReqRes({}, null, { role: "Lender" });
    const mockOfficer = createMockReqRes({}, null, { role: "LoanOfficer" });

    middleware(mockLender.req, mockLender.res, mockLender.next);
    middleware(mockOfficer.req, mockOfficer.res, mockOfficer.next);

    assert(mockLender.isNextCalled(), "[ALLOWED] Multi-role middleware permits Lender");
    assert(mockOfficer.isNextCalled(), "[ALLOWED] Multi-role middleware permits LoanOfficer");
  }

  // Test 1.4: Allowed access via req.user object fallback
  {
    const middleware = authorize("Lender");
    const mock = createMockReqRes({}, { _id: "u3", role: "Lender" });
    middleware(mock.req, mock.res, mock.next);
    assert(mock.isNextCalled(), "[ALLOWED] Permits access when role is populated on req.user profile");
  }

  // Test 1.5: Allowed access with case-insensitive and whitespace-flexible role string
  {
    const middleware = authorize("Lender", "Loan Officer");
    const mockLower = createMockReqRes({}, null, { role: "lender" });
    const mockSpaced = createMockReqRes({}, null, { role: "LoanOfficer" });

    middleware(mockLower.req, mockLower.res, mockLower.next);
    middleware(mockSpaced.req, mockSpaced.res, mockSpaced.next);

    assert(mockLower.isNextCalled(), "[ALLOWED] Normalizes lowercase 'lender' to match 'Lender'");
    assert(mockSpaced.isNextCalled(), "[ALLOWED] Normalizes 'LoanOfficer' to match 'Loan Officer'");
  }

  // Test 1.6: Allowed access using convenience middleware helper requireLender
  {
    const mockLender = createMockReqRes({}, null, { role: "Lender" });
    const mockAdmin = createMockReqRes({}, null, { role: "Admin" });

    requireLender(mockLender.req, mockLender.res, mockLender.next);
    requireLender(mockAdmin.req, mockAdmin.res, mockAdmin.next);

    assert(mockLender.isNextCalled(), "[ALLOWED] requireLender helper permits Lender role");
    assert(mockAdmin.isNextCalled(), "[ALLOWED] requireLender helper permits Admin role");
  }

  // Test 1.7: Allowed access using convenience middleware helper requireLoanOfficer
  {
    const mockOfficer = createMockReqRes({}, null, { role: "LoanOfficer" });
    requireLoanOfficer(mockOfficer.req, mockOfficer.res, mockOfficer.next);
    assert(mockOfficer.isNextCalled(), "[ALLOWED] requireLoanOfficer helper permits LoanOfficer role");
  }

  // ==================================================
  // CATEGORY 2: DENIED ACCESS CASES (HTTP 403 & 401)
  // ==================================================
  console.log("\n--- 2. DENIED ACCESS CASES ---");

  // Test 2.1: Denied access when user role is unauthorized (LoanOfficer -> Lender endpoint)
  {
    const middleware = authorize("Lender");
    const mock = createMockReqRes({}, null, { role: "LoanOfficer" });
    middleware(mock.req, mock.res, mock.next);

    assert(!mock.isNextCalled(), "[DENIED] Stops middleware execution chain for unauthorized role");
    assert(mock.getStatus() === 403, "[DENIED] Returns HTTP 403 Forbidden status code for unauthorized role");
    assert(mock.getBody() && mock.getBody().message.includes("Forbidden"), "[DENIED] 403 payload includes descriptive error message");
  }

  // Test 2.2: Denied access when user role is unauthorized (Lender -> LoanOfficer endpoint)
  {
    const middleware = authorize("LoanOfficer");
    const mock = createMockReqRes({}, null, { role: "Lender" });
    middleware(mock.req, mock.res, mock.next);

    assert(!mock.isNextCalled(), "[DENIED] Lender denied access to LoanOfficer-only route");
    assert(mock.getStatus() === 403, "[DENIED] Returns HTTP 403 Forbidden for Lender on LoanOfficer route");
  }

  // Test 2.3: Denied access when user role is not listed in multi-role whitelist
  {
    const middleware = authorize("Lender", "LoanOfficer");
    const mock = createMockReqRes({}, null, { role: "Auditor" });
    middleware(mock.req, mock.res, mock.next);

    assert(!mock.isNextCalled() && mock.getStatus() === 403, "[DENIED] Multi-role middleware denies unlisted role 'Auditor' with 403");
  }

  // Test 2.4: Denied access when request contains no role information
  {
    const middleware = authorize("Lender");
    const mock = createMockReqRes({}, null, null);
    middleware(mock.req, mock.res, mock.next);

    assert(!mock.isNextCalled(), "[DENIED] Stops execution when no role payload exists");
    assert(mock.getStatus() === 403, "[DENIED] Missing role returns HTTP 403 error status");
  }

  // Test 2.5: Denied access using requireLender helper on non-lender role
  {
    const mock = createMockReqRes({}, null, { role: "LoanOfficer" });
    requireLender(mock.req, mock.res, mock.next);
    assert(!mock.isNextCalled() && mock.getStatus() === 403, "[DENIED] requireLender helper rejects LoanOfficer with HTTP 403");
  }

  // Test 2.6: Denied access using requireAdmin helper on non-admin role
  {
    const mockLender = createMockReqRes({}, null, { role: "Lender" });
    requireAdmin(mockLender.req, mockLender.res, mockLender.next);
    assert(!mockLender.isNextCalled() && mockLender.getStatus() === 403, "[DENIED] requireAdmin helper rejects Lender with HTTP 403");
  }

  // Test 2.7: Protect middleware denies request missing authorization token (401)
  {
    const mock = createMockReqRes({ authorization: "" });
    await protect(mock.req, mock.res, mock.next);
    assert(!mock.isNextCalled(), "[DENIED] Protect middleware stops request missing Bearer token");
    assert(mock.getStatus() === 401, "[DENIED] Protect middleware returns HTTP 401 Unauthorized for missing token");
  }

  // Test 2.8: Protect middleware denies request with invalid JWT signature (401)
  {
    const mock = createMockReqRes({ authorization: "Bearer invalid.jwt.token" });
    await protect(mock.req, mock.res, mock.next);
    assert(!mock.isNextCalled(), "[DENIED] Protect middleware stops request with malformed token");
    assert(mock.getStatus() === 401, "[DENIED] Protect middleware returns HTTP 401 for malformed token");
  }

  // ==================================================
  // CATEGORY 3: END-TO-END PIPELINE INTEGRATION
  // ==================================================
  console.log("\n--- 3. END-TO-END PIPELINE INTEGRATION ---");

  {
    User.findById = (id) => ({
      select: () => Promise.resolve({ _id: id, name: "Loan Officer User", role: "LoanOfficer" }),
    });

    const officerToken = jwt.sign({ id: "officer_777", role: "LoanOfficer" }, JWT_SECRET);
    const headers = { authorization: `Bearer ${officerToken}` };

    const mockProtect = createMockReqRes(headers);
    await protect(mockProtect.req, mockProtect.res, mockProtect.next);
    assert(mockProtect.isNextCalled(), "[E2E] Protect middleware authenticates valid JWT token");

    // E2E Pipeline step 2: Authorize Lender-only endpoint -> Expect 403
    const lenderMiddleware = authorize("Lender");
    const mockLenderRoute = createMockReqRes(headers, mockProtect.req.user, mockProtect.req.tokenData);
    lenderMiddleware(mockLenderRoute.req, mockLenderRoute.res, mockLenderRoute.next);
    assert(mockLenderRoute.getStatus() === 403, "[E2E] Pipeline correctly denies LoanOfficer access to Lender route with 403");

    // E2E Pipeline step 3: Authorize LoanOfficer-only endpoint -> Expect 200 (next called)
    const officerMiddleware = authorize("LoanOfficer");
    const mockOfficerRoute = createMockReqRes(headers, mockProtect.req.user, mockProtect.req.tokenData);
    officerMiddleware(mockOfficerRoute.req, mockOfficerRoute.res, mockOfficerRoute.next);
    assert(mockOfficerRoute.isNextCalled(), "[E2E] Pipeline correctly permits LoanOfficer access to LoanOfficer route");
  }

  console.log("\n==================================================");
  console.log(`  TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log("==================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
};

runMiddlewareUnitTestSuite().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
