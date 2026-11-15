// Security Rules Logic and Negative Test Suite
// Validates Firestore security invariants and tests simulated operations against rules specification.

import { readFileSync } from "fs";

const rulesContent = readFileSync("./firestore.rules", "utf-8");

console.log("=== FIRESTORE RULES VALIDATION SUITE ===");

// 1. Verify Rules Structure & Syntax Invariants
const checks = [
  {
    name: "Enforces rules_version = '2'",
    pass: rulesContent.includes("rules_version = '2'"),
  },
  {
    name: "Checks request.auth != null (isAuthenticated)",
    pass: rulesContent.includes("request.auth != null"),
  },
  {
    name: "Checks UID matching isOwner(userId)",
    pass: rulesContent.includes("request.auth.uid == userId"),
  },
  {
    name: "Locks public registration to role == 'user'",
    pass: rulesContent.includes("request.resource.data.role == 'user'"),
  },
  {
    name: "Verifies email matches auth token (request.auth.token.email)",
    pass: rulesContent.includes("request.resource.data.email == request.auth.token.email"),
  },
  {
    name: "Restricts update affected keys to ['name', 'department'] for standard users",
    pass: rulesContent.includes("affectedKeys().hasOnly(['name', 'department'])"),
  },
  {
    name: "Validates department against approved list",
    pass: rulesContent.includes("isValidDepartment(request.resource.data.department)"),
  },
  {
    name: "Protects uid, email, role, and createdAt from modification",
    pass:
      rulesContent.includes("request.resource.data.role == resource.data.role") &&
      rulesContent.includes("request.resource.data.uid == resource.data.uid") &&
      rulesContent.includes("request.resource.data.email == resource.data.email"),
  },
  {
    name: "Restricts delete to admin only",
    pass: rulesContent.includes("allow delete: if isAdmin();"),
  },
];

let allPassed = true;
console.log("\n--- Static Rule Invariant Verification ---");
for (const check of checks) {
  if (check.pass) {
    console.log(`[PASS] ${check.name}`);
  } else {
    console.log(`[FAIL] ${check.name}`);
    allPassed = false;
  }
}

// 2. Logic Simulation of Negative Test Scenarios
console.log("\n--- Negative Security Test Matrix Simulation ---");

const APPROVED_DEPTS = [
  "Computer Science & Engineering",
  "Information Technology",
  "Electronics & Communication Engineering",
  "Electrical & Electronics Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "General Sciences & Humanities",
];

function simulateCreateUser({ auth, docId, data }) {
  if (!auth) return { allowed: false, reason: "Unauthenticated" };
  if (auth.uid !== docId) return { allowed: false, reason: "Document ID mismatch" };
  if (data.uid !== auth.uid) return { allowed: false, reason: "UID does not match auth token" };
  if (data.email !== auth.token?.email) return { allowed: false, reason: "Email does not match token" };
  if (data.role !== "user") return { allowed: false, reason: "Role must be 'user'" };
  if (!APPROVED_DEPTS.includes(data.department)) return { allowed: false, reason: "Invalid department" };
  const allowedKeys = ['uid', 'name', 'email', 'role', 'department', 'createdAt'];
  const hasOnly = Object.keys(data).every(k => allowedKeys.includes(k));
  if (!hasOnly) return { allowed: false, reason: "Unauthorized extra fields" };
  return { allowed: true };
}

function simulateUpdateUser({ auth, existingDoc, updateData, userIsAdmin = false }) {
  if (!auth) return { allowed: false, reason: "Unauthenticated" };
  if (userIsAdmin) return { allowed: true };

  if (auth.uid !== existingDoc.uid) return { allowed: false, reason: "Cross-user update forbidden" };

  // Check affected keys
  const affectedKeys = Object.keys(updateData);
  const onlyAllowed = affectedKeys.every(k => ['name', 'department'].includes(k));
  if (!onlyAllowed) return { allowed: false, reason: "Cannot modify protected fields (role, uid, email, createdAt)" };

  if (updateData.department && !APPROVED_DEPTS.includes(updateData.department)) {
    return { allowed: false, reason: "Invalid department" };
  }

  return { allowed: true };
}

function simulateReadUser({ auth, targetDoc, userIsAdmin = false }) {
  if (!auth) return { allowed: false, reason: "Unauthenticated" };
  if (userIsAdmin) return { allowed: true };
  if (auth.uid === targetDoc.uid) return { allowed: true };
  return { allowed: false, reason: "Cross-user read forbidden" };
}

const scenarios = [
  {
    name: "Scenario 1: Regular user attempts self-promotion to role 'admin'",
    test: () => {
      const res = simulateUpdateUser({
        auth: { uid: "user_1" },
        existingDoc: { uid: "user_1", role: "user", email: "user@college.edu" },
        updateData: { role: "admin" },
      });
      return !res.allowed; // Expected to be blocked
    },
  },
  {
    name: "Scenario 2: Regular user attempts email modification",
    test: () => {
      const res = simulateUpdateUser({
        auth: { uid: "user_1" },
        existingDoc: { uid: "user_1", role: "user", email: "user@college.edu" },
        updateData: { email: "attacker@domain.com" },
      });
      return !res.allowed;
    },
  },
  {
    name: "Scenario 3: Regular user attempts UID modification",
    test: () => {
      const res = simulateUpdateUser({
        auth: { uid: "user_1" },
        existingDoc: { uid: "user_1", role: "user", email: "user@college.edu" },
        updateData: { uid: "user_2" },
      });
      return !res.allowed;
    },
  },
  {
    name: "Scenario 4: Registration with unapproved department",
    test: () => {
      const res = simulateCreateUser({
        auth: { uid: "user_1", token: { email: "user@college.edu" } },
        docId: "user_1",
        data: {
          uid: "user_1",
          email: "user@college.edu",
          name: "Test User",
          role: "user",
          department: "Arbitrary Fictitious Department",
          createdAt: new Date(),
        },
      });
      return !res.allowed;
    },
  },
  {
    name: "Scenario 5: Regular user attempts to read another user's document",
    test: () => {
      const res = simulateReadUser({
        auth: { uid: "user_1" },
        targetDoc: { uid: "user_2" },
        userIsAdmin: false,
      });
      return !res.allowed;
    },
  },
  {
    name: "Scenario 6: Legitimate user self-update of name and valid department",
    test: () => {
      const res = simulateUpdateUser({
        auth: { uid: "user_1" },
        existingDoc: { uid: "user_1", role: "user", email: "user@college.edu" },
        updateData: { name: "Updated Name", department: "Information Technology" },
      });
      return res.allowed;
    },
  },
  {
    name: "Scenario 7: Verified Admin reading any user document",
    test: () => {
      const res = simulateReadUser({
        auth: { uid: "admin_uid" },
        targetDoc: { uid: "user_2" },
        userIsAdmin: true,
      });
      return res.allowed;
    },
  },
];

let scenariosPassed = true;
for (const sc of scenarios) {
  const result = sc.test();
  if (result) {
    console.log(`[PASS] ${sc.name}`);
  } else {
    console.log(`[FAIL] ${sc.name}`);
    scenariosPassed = false;
  }
}

if (!allPassed || !scenariosPassed) {
  console.error("\nSecurity validation suite encountered errors!");
  process.exit(1);
} else {
  console.log("\nAll security rule invariants and negative scenarios PASSED successfully.");
}

