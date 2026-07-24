const { getBorrowers, getBorrowerById } = require("./controllers/borrowerController");

const runTests = async () => {
  console.log("=== RUNNING BORROWER PROFILE DETAIL & LIST ENDPOINT TESTS ===");

  // Test 1: Fetch list of borrowers without query
  let resCode1, resBody1;
  const req1 = { query: {} };
  const res1 = {
    status: (code) => { resCode1 = code; return res1; },
    json: (data) => { resBody1 = data; }
  };
  await getBorrowers(req1, res1);
  console.log(
    "Test 1 (Get all borrowers):",
    resBody1 && resBody1.success && resBody1.count > 0 ? "PASSED" : "FAILED",
    `Found ${resBody1 ? resBody1.count : 0} borrowers`
  );

  // Test 2: Search borrowers by query 'Sunita'
  let resCode2, resBody2;
  const req2 = { query: { search: "Sunita" } };
  const res2 = {
    status: (code) => { resCode2 = code; return res2; },
    json: (data) => { resBody2 = data; }
  };
  await getBorrowers(req2, res2);
  console.log(
    "Test 2 (Search borrower 'Sunita'):",
    resBody2 && resBody2.success && resBody2.data.some(b => b.name.includes("Sunita")) ? "PASSED" : "FAILED",
    resBody2 ? resBody2.data.map(b => b.name) : []
  );

  // Test 3: Get single borrower detail by ID ('bw_8842')
  let resCode3, resBody3;
  const req3 = { params: { id: "bw_8842" } };
  const res3 = {
    status: (code) => { resCode3 = code; return res3; },
    json: (data) => { resBody3 = data; }
  };
  await getBorrowerById(req3, res3);
  console.log(
    "Test 3 (Get borrower detail for bw_8842):",
    resBody3 && resBody3.success && resBody3.data.borrowerCode === "BW-2024-8842" ? "PASSED" : "FAILED",
    resBody3 ? resBody3.data.name : null
  );

  // Test 4: Missing / invalid borrower ID returns 404
  let resCode4, resBody4;
  const req4 = { params: { id: "non_existent_id" } };
  const res4 = {
    status: (code) => { resCode4 = code; return res4; },
    json: (data) => { resBody4 = data; }
  };
  await getBorrowerById(req4, res4);
  console.log(
    "Test 4 (404 for invalid borrower ID):",
    resCode4 === 404 ? "PASSED" : "FAILED",
    resBody4
  );

  // Test 5: Verify missing data handling for borrower with incomplete fields (bw_5521)
  let resCode5, resBody5;
  const req5 = { params: { id: "bw_5521" } };
  const res5 = {
    status: (code) => { resCode5 = code; return res5; },
    json: (data) => { resBody5 = data; }
  };
  await getBorrowerById(req5, res5);
  const incompleteBorrower = resBody5?.data;
  console.log(
    "Test 5 (Incomplete data handling test):",
    incompleteBorrower && incompleteBorrower.phone === null && incompleteBorrower.activities.length === 0 ? "PASSED" : "FAILED",
    { name: incompleteBorrower?.name, phone: incompleteBorrower?.phone, activitiesCount: incompleteBorrower?.activities?.length }
  );

  console.log("=== ALL BORROWER ENDPOINT TESTS COMPLETED SUCCESSFULLY ===");
};

runTests().catch(console.error);
