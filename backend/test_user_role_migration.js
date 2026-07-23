const User = require("./models/User");
const { migrateUserRoles } = require("./scripts/migrate_user_roles");

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

const runUserRoleSchemaAndMigrationTests = async () => {
  console.log("==================================================");
  console.log("  RUNNING USER ROLE SCHEMA & MIGRATION UNIT TESTS");
  console.log("==================================================\n");

  // --- Test 1: Verify User.ROLES Constant Definition ---
  assert(User.ROLES !== undefined, "User model exports ROLES object");
  assert(User.ROLES.LENDER === "Lender", "User.ROLES.LENDER is defined as 'Lender'");
  assert(User.ROLES.LOAN_OFFICER === "LoanOfficer", "User.ROLES.LOAN_OFFICER is defined as 'LoanOfficer'");
  assert(User.ROLES.ADMIN === "Admin", "User.ROLES.ADMIN is defined as 'Admin'");

  // --- Test 2: Schema default role value ---
  const defaultUser = new User({
    name: "Test User",
    email: "test_default@example.com",
    password: "password123",
  });
  assert(defaultUser.role === "Lender", "Default role assigned by schema is 'Lender'");

  // --- Test 3: Schema validation for allowed roles ---
  const lenderUser = new User({ name: "Lender User", email: "lender@example.com", password: "password123", role: "Lender" });
  const officerUser = new User({ name: "Officer User", email: "officer@example.com", password: "password123", role: "LoanOfficer" });
  const adminUser = new User({ name: "Admin User", email: "admin@example.com", password: "password123", role: "Admin" });

  const errLender = await lenderUser.validate().catch((err) => err);
  const errOfficer = await officerUser.validate().catch((err) => err);
  const errAdmin = await adminUser.validate().catch((err) => err);

  assert(!(errLender instanceof Error), "Role 'Lender' passes schema validation");
  assert(!(errOfficer instanceof Error), "Role 'LoanOfficer' passes schema validation");
  assert(!(errAdmin instanceof Error), "Role 'Admin' passes schema validation");

  // --- Test 4: Schema validation rejects invalid role ---
  const invalidUser = new User({ name: "Invalid User", email: "invalid@example.com", password: "password123", role: "SuperBoss" });
  const errInvalid = await invalidUser.validate().catch((err) => err);
  assert(errInvalid && errInvalid.errors && errInvalid.errors.role, "Schema rejects invalid role 'SuperBoss'");

  // --- Test 5: Unit test migration script logic with mock database model ---
  const mockUsers = [
    { _id: "1", name: "User 1", role: "Lender" },
    { _id: "2", name: "User 2" }, // missing role
    { _id: "3", name: "User 3", role: null }, // null role
    { _id: "4", name: "User 4", role: "LoanOfficer" },
    { _id: "5", name: "User 5", role: "InvalidRole" }, // invalid role
  ];

  const mockModel = {
    countDocuments: async (filter) => {
      return mockUsers.filter((u) => {
        return (
          u.role === undefined ||
          u.role === null ||
          u.role === "" ||
          !["Lender", "LoanOfficer", "Admin"].includes(u.role)
        );
      }).length;
    },
    updateMany: async (filter, update) => {
      let updatedCount = 0;
      mockUsers.forEach((u) => {
        if (
          u.role === undefined ||
          u.role === null ||
          u.role === "" ||
          !["Lender", "LoanOfficer", "Admin"].includes(u.role)
        ) {
          u.role = update.$set.role;
          updatedCount++;
        }
      });
      return { matchedCount: updatedCount, modifiedCount: updatedCount };
    },
  };

  const migrationResult = await migrateUserRoles(mockModel, "Lender");

  assert(migrationResult.modifiedCount === 3, "Migration updated exactly 3 users lacking valid roles");
  assert(mockUsers[1].role === "Lender", "User 2 migrated to default role 'Lender'");
  assert(mockUsers[2].role === "Lender", "User 3 migrated to default role 'Lender'");
  assert(mockUsers[4].role === "Lender", "User 5 with invalid role migrated to default role 'Lender'");
  assert(mockUsers[0].role === "Lender", "User 1 retained existing 'Lender' role");
  assert(mockUsers[3].role === "LoanOfficer", "User 4 retained existing 'LoanOfficer' role");

  console.log("\n==================================================");
  console.log(`  TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log("==================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
};

runUserRoleSchemaAndMigrationTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
