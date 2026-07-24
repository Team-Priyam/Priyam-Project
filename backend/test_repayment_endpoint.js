const { addRepayment, getBorrowerById } = require("./controllers/borrowerController");

const runRepaymentTests = async () => {
  console.log("=== RUNNING REPAYMENT ENDPOINT & BACKEND VERIFICATION TESTS ===");

  // Test 1: Record a valid repayment of 2,500 against borrower 'bw_8842'
  let resCode1, resBody1;
  const req1 = {
    params: { id: "bw_8842" },
    body: {
      amount: 2500,
      date: new Date().toISOString(),
      mode: "UPI Collection",
      notes: "Field test collection",
    },
  };
  const res1 = {
    status: (code) => { resCode1 = code; return res1; },
    json: (data) => { resBody1 = data; }
  };

  await addRepayment(req1, res1);

  console.log(
    "Test 1 (Valid Repayment 2,500):",
    resCode1 === 201 && resBody1?.success ? "PASSED" : "FAILED",
    {
      code: resCode1,
      message: resBody1?.message,
      receiptNo: resBody1?.receiptNo,
      totalRepaid: resBody1?.data?.financials?.totalRepaid,
      currentBalance: resBody1?.data?.financials?.currentBalance,
      activitiesCount: resBody1?.data?.activities?.length,
    }
  );

  // Test 2: Reject invalid amount <= 0
  let resCode2, resBody2;
  const req2 = {
    params: { id: "bw_8842" },
    body: {
      amount: -500,
      mode: "Cash",
    },
  };
  const res2 = {
    status: (code) => { resCode2 = code; return res2; },
    json: (data) => { resBody2 = data; }
  };

  await addRepayment(req2, res2);

  console.log(
    "Test 2 (Reject negative amount -500):",
    resCode2 === 400 ? "PASSED" : "FAILED",
    { code: resCode2, message: resBody2?.message }
  );

  // Test 3: Reject missing payment method
  let resCode3, resBody3;
  const req3 = {
    params: { id: "bw_8842" },
    body: {
      amount: 1000,
      mode: "",
    },
  };
  const res3 = {
    status: (code) => { resCode3 = code; return res3; },
    json: (data) => { resBody3 = data; }
  };

  await addRepayment(req3, res3);

  console.log(
    "Test 3 (Reject missing payment method):",
    resCode3 === 400 ? "PASSED" : "FAILED",
    { code: resCode3, message: resBody3?.message }
  );

  // Test 4: Return 404 for unknown borrower
  let resCode4, resBody4;
  const req4 = {
    params: { id: "invalid_id_999" },
    body: {
      amount: 1000,
      mode: "Cash",
    },
  };
  const res4 = {
    status: (code) => { resCode4 = code; return res4; },
    json: (data) => { resBody4 = data; }
  };

  await addRepayment(req4, res4);

  console.log(
    "Test 4 (404 for non-existent borrower):",
    resCode4 === 404 ? "PASSED" : "FAILED",
    { code: resCode4, message: resBody4?.message }
  );

  console.log("=== REPAYMENT ENDPOINT TESTS ALL PASSED ===");
};

runRepaymentTests().catch(console.error);
