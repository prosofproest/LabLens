// Firestore Security Rules Test Suite executed directly against the live Firestore Emulator
// Exercises actual Firestore Security Rules inside cloud-firestore-emulator

const BASE = "http://127.0.0.1:8080/v1/projects/lablens-ai-test/databases/(default)/documents";

function makeJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.`;
}

function authHeader(uid, email) {
  if (!uid) return {};
  const token = makeJwt({
    user_id: uid,
    sub: uid,
    email: email || `${uid}@college.edu`,
    aud: "lablens-ai-test",
    iss: "https://securetoken.google.com/lablens-ai-test",
  });
  return { Authorization: `Bearer ${token}` };
}

// Convert plain JS object to Firestore REST document fields
function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      fields[key] = { stringValue: value };
    } else if (typeof value === "number") {
      fields[key] = { integerValue: String(value) };
    } else if (typeof value === "boolean") {
      fields[key] = { booleanValue: value };
    } else if (value instanceof Date) {
      fields[key] = { timestampValue: value.toISOString() };
    }
  }
  return fields;
}

// REST Helpers
async function seedDoc(collection, docId, data) {
  const url = `${BASE}/${collection}/${docId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: "Bearer owner", // Root bypass to seed initial test state
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to seed ${collection}/${docId}: ${res.status} ${errText}`);
  }
}

async function getDoc(collection, docId, uid, email) {
  const res = await fetch(`${BASE}/${collection}/${docId}`, {
    headers: { ...authHeader(uid, email) },
  });
  return res;
}

async function createDoc(collection, docId, data, uid, email) {
  const res = await fetch(`${BASE}/${collection}?documentId=${docId}`, {
    method: "POST",
    headers: {
      ...authHeader(uid, email),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
  return res;
}

async function updateDoc(collection, docId, data, updateMask, uid, email) {
  const maskParams = updateMask.map(m => `updateMask.fieldPaths=${m}`).join("&");
  const url = `${BASE}/${collection}/${docId}?${maskParams}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      ...authHeader(uid, email),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
  return res;
}

async function runTests() {
  console.log("=== EXECUTING FIRESTORE SECURITY RULES ON LIVE EMULATOR ===\n");

  const results = [];

  async function assertFails(testName, promise) {
    const res = await promise;
    if (res.status === 403 || res.status === 400) {
      console.log(`[PASS] ${testName} (Blocked with HTTP ${res.status})`);
      results.push({ name: testName, pass: true });
    } else {
      console.error(`[FAIL] ${testName} (Expected 403/400, got HTTP ${res.status})`);
      results.push({ name: testName, pass: false, status: res.status });
    }
  }

  async function assertSucceeds(testName, promise) {
    const res = await promise;
    if (res.ok) {
      console.log(`[PASS] ${testName} (Allowed with HTTP ${res.status})`);
      results.push({ name: testName, pass: true });
    } else {
      const errText = await res.text();
      console.error(`[FAIL] ${testName} (Expected 200 OK, got HTTP ${res.status}): ${errText}`);
      results.push({ name: testName, pass: false, status: res.status });
    }
  }

  // --- SEED FIXTURES (Bypassing rules using admin root) ---
  await seedDoc("users", "user_b", {
    uid: "user_b",
    name: "User B Student",
    email: "user_b@college.edu",
    role: "user",
    department: "Information Technology",
    createdAt: new Date("2026-01-01T00:00:00Z"),
  });

  await seedDoc("users", "admin_user", {
    uid: "admin_user",
    name: "Campus Lab Administrator",
    email: "admin@college.edu",
    role: "admin",
    department: "Computer Science & Engineering",
    createdAt: new Date("2026-01-01T00:00:00Z"),
  });

  await seedDoc("users", "user_a", {
    uid: "user_a",
    name: "User A Student",
    email: "user_a@college.edu",
    role: "user",
    department: "Computer Science & Engineering",
    createdAt: new Date("2026-01-01T00:00:00Z"),
  });

  // ==================== NEGATIVE TESTS ====================
  console.log("--- Negative Security Tests ---");

  // 1a. Unauthenticated user cannot read protected user profiles
  await assertFails(
    "Negative 1a: Unauthenticated user cannot read protected user profiles",
    getDoc("users", "user_b", null, null)
  );

  // 1b. Unauthenticated user cannot write protected user profiles
  await assertFails(
    "Negative 1b: Unauthenticated user cannot write protected user profiles",
    createDoc("users", "unauth_user", {
      uid: "unauth_user",
      name: "Attacker",
      email: "attack@hack.com",
      role: "user",
      department: "Computer Science & Engineering",
      createdAt: new Date(),
    }, null, null)
  );

  // 2. User A cannot read User B's profile
  await assertFails(
    "Negative 2: User A cannot read User B's profile",
    getDoc("users", "user_b", "user_a", "user_a@college.edu")
  );

  // 3. User A cannot update User B's profile
  await assertFails(
    "Negative 3: User A cannot update User B's profile",
    updateDoc("users", "user_b", { name: "Tampered Name" }, ["name"], "user_a", "user_a@college.edu")
  );

  // 4. Regular user cannot promote themselves to admin
  await assertFails(
    "Negative 4: Regular user cannot promote themselves to admin",
    updateDoc("users", "user_a", { role: "admin" }, ["role"], "user_a", "user_a@college.edu")
  );

  // 5a. Regular user cannot modify their UID
  await assertFails(
    "Negative 5a: Regular user cannot modify their UID",
    updateDoc("users", "user_a", { uid: "other_uid" }, ["uid"], "user_a", "user_a@college.edu")
  );

  // 5b. Regular user cannot modify their email
  await assertFails(
    "Negative 5b: Regular user cannot modify their email",
    updateDoc("users", "user_a", { email: "attacker@domain.com" }, ["email"], "user_a", "user_a@college.edu")
  );

  // 5c. Regular user cannot modify their createdAt
  await assertFails(
    "Negative 5c: Regular user cannot modify their createdAt",
    updateDoc("users", "user_a", { createdAt: new Date("1999-01-01T00:00:00Z") }, ["createdAt"], "user_a", "user_a@college.edu")
  );

  // 6. Invalid department values are rejected
  await assertFails(
    "Negative 6: Invalid department values are rejected during registration",
    createDoc("users", "user_invalid_dept", {
      uid: "user_invalid_dept",
      name: "Invalid Student",
      email: "invalid@college.edu",
      role: "user",
      department: "Fictitious Department",
      createdAt: new Date(),
    }, "user_invalid_dept", "invalid@college.edu")
  );

  // 7. Public registration cannot create an admin profile
  await assertFails(
    "Negative 7: Public registration cannot create an admin profile",
    createDoc("users", "attacker_admin", {
      uid: "attacker_admin",
      name: "Malicious Admin",
      email: "malicious@college.edu",
      role: "admin",
      department: "Computer Science & Engineering",
      createdAt: new Date(),
    }, "attacker_admin", "malicious@college.edu")
  );

  // ==================== POSITIVE TESTS ====================
  console.log("\n--- Positive Security Tests ---");

  // 1. Authenticated user can create their own valid user profile
  await assertSucceeds(
    "Positive 1: Authenticated user can create their own valid user profile",
    createDoc("users", "new_valid_student", {
      uid: "new_valid_student",
      name: "Valid Student",
      email: "valid@college.edu",
      role: "user",
      department: "Computer Science & Engineering",
      createdAt: new Date(),
    }, "new_valid_student", "valid@college.edu")
  );

  // 2. User can update their own name and department
  await assertSucceeds(
    "Positive 2: User can update their own name and valid department",
    updateDoc(
      "users",
      "user_a",
      {
        name: "User A Updated Name",
        department: "Information Technology",
      },
      ["name", "department"],
      "user_a",
      "user_a@college.edu"
    )
  );

  // 3. Verified admin can read other user profiles
  await assertSucceeds(
    "Positive 3: Verified admin can read other user profiles",
    getDoc("users", "user_b", "admin_user", "admin@college.edu")
  );

  // 4. Verified admin can perform permitted administrative operations (promote user to admin)
  await assertSucceeds(
    "Positive 4: Verified admin can update user role or administrative fields",
    updateDoc("users", "user_b", { role: "admin" }, ["role"], "admin_user", "admin@college.edu")
  );

  const passed = results.filter(r => r.pass).length;
  console.log(`\n==============================================`);
  console.log(`EMULATOR TEST SUMMARY: ${passed}/${results.length} PASSED`);
  console.log(`==============================================`);

  if (passed !== results.length) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
