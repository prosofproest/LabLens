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

// Convert plain JS object to Firestore REST document fields (handles primitives, maps, nulls, dates)
function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null) {
      fields[key] = { nullValue: null };
    } else if (typeof value === "string") {
      fields[key] = { stringValue: value };
    } else if (typeof value === "number") {
      fields[key] = { integerValue: String(value) };
    } else if (typeof value === "boolean") {
      fields[key] = { booleanValue: value };
    } else if (value instanceof Date) {
      fields[key] = { timestampValue: value.toISOString() };
    } else if (typeof value === "object" && !Array.isArray(value)) {
      fields[key] = { mapValue: { fields: toFirestoreFields(value) } };
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

async function deleteDoc(collection, docId, uid, email) {
  const url = `${BASE}/${collection}/${docId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      ...authHeader(uid, email),
    },
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

  // Seed a report owned by user_b
  await seedDoc("reports", "report_user_b", {
    equipmentName: "Oscilloscope Rig B",
    assetId: "LAB-ECE-012",
    labName: "VLSI & Digital Circuits Lab (Room 214)",
    description: "Channel 2 input voltage reading floating randomly.",
    imageUrl: null,
    imagePublicId: null,
    reportedBy: {
      uid: "user_b",
      name: "User B Student",
      email: "user_b@college.edu",
      department: "Information Technology",
    },
    status: "Reported",
    priority: "Medium",
    aiAnalysis: null,
    assignedTechnician: null,
    assignedAt: null,
    adminNotes: null,
    createdAt: new Date("2026-01-02T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
  });

  // ==================== USERS COLLECTION TESTS ====================
  console.log("--- Users Collection Security Tests ---");

  // N1a. Unauthenticated user cannot read protected user profiles
  await assertFails(
    "Negative 1a: Unauthenticated user cannot read protected user profiles",
    getDoc("users", "user_b", null, null)
  );

  // N1b. Unauthenticated user cannot write protected user profiles
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

  // N2. User A cannot read User B's profile
  await assertFails(
    "Negative 2: User A cannot read User B's profile",
    getDoc("users", "user_b", "user_a", "user_a@college.edu")
  );

  // N3. User A cannot update User B's profile
  await assertFails(
    "Negative 3: User A cannot update User B's profile",
    updateDoc("users", "user_b", { name: "Tampered Name" }, ["name"], "user_a", "user_a@college.edu")
  );

  // N4. Regular user cannot promote themselves to admin
  await assertFails(
    "Negative 4: Regular user cannot promote themselves to admin",
    updateDoc("users", "user_a", { role: "admin" }, ["role"], "user_a", "user_a@college.edu")
  );

  // N5a. Regular user cannot modify their UID
  await assertFails(
    "Negative 5a: Regular user cannot modify their UID",
    updateDoc("users", "user_a", { uid: "other_uid" }, ["uid"], "user_a", "user_a@college.edu")
  );

  // N5b. Regular user cannot modify their email
  await assertFails(
    "Negative 5b: Regular user cannot modify their email",
    updateDoc("users", "user_a", { email: "attacker@domain.com" }, ["email"], "user_a", "user_a@college.edu")
  );

  // N5c. Regular user cannot modify their createdAt
  await assertFails(
    "Negative 5c: Regular user cannot modify their createdAt",
    updateDoc("users", "user_a", { createdAt: new Date("1999-01-01T00:00:00Z") }, ["createdAt"], "user_a", "user_a@college.edu")
  );

  // N6. Invalid department values are rejected
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

  // N7. Public registration cannot create an admin profile
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

  // P1. Authenticated user can create their own valid user profile
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

  // P2. User can update their own name and department
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

  // P3. Verified admin can read other user profiles
  await assertSucceeds(
    "Positive 3: Verified admin can read other user profiles",
    getDoc("users", "user_b", "admin_user", "admin@college.edu")
  );

  // P4. Verified admin can perform permitted administrative operations
  await assertSucceeds(
    "Positive 4: Verified admin can update user role or administrative fields",
    updateDoc("users", "user_b", { role: "admin" }, ["role"], "admin_user", "admin@college.edu")
  );

  // ==================== REPORTS COLLECTION TESTS ====================
  console.log("\n--- Reports Collection Security Tests ---");

  // R_N1. Unauthenticated user cannot create reports
  await assertFails(
    "Report Negative 1: Unauthenticated user cannot create reports",
    createDoc("reports", "unauth_report", {
      equipmentName: "Dell Precision 3640",
      assetId: "LAB-CS-101",
      labName: "Advanced Computing Lab (Room 304)",
      description: "Boot drive failed S.M.A.R.T. self-test.",
      imageUrl: null,
      imagePublicId: null,
      reportedBy: { uid: "user_a", name: "User A", email: "user_a@college.edu" },
      status: "Reported",
      priority: "Medium",
      aiAnalysis: null,
      assignedTechnician: null,
      assignedAt: null,
      adminNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }, null, null)
  );

  // R_N2. User A cannot spoof reportedBy.uid as User B
  await assertFails(
    "Report Negative 2: User A cannot spoof reportedBy.uid as User B",
    createDoc("reports", "spoofed_report", {
      equipmentName: "Dell Precision 3640",
      assetId: "LAB-CS-101",
      labName: "Advanced Computing Lab (Room 304)",
      description: "Boot drive failed S.M.A.R.T. self-test.",
      imageUrl: null,
      imagePublicId: null,
      reportedBy: { uid: "user_b", name: "User B", email: "user_b@college.edu" },
      status: "Reported",
      priority: "Medium",
      aiAnalysis: null,
      assignedTechnician: null,
      assignedAt: null,
      adminNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }, "user_a", "user_a@college.edu")
  );

  // R_N3. User cannot create report with initial status 'Resolved'
  await assertFails(
    "Report Negative 3: User cannot create report with initial status 'Resolved'",
    createDoc("reports", "premature_resolved", {
      equipmentName: "Dell Precision 3640",
      assetId: "LAB-CS-101",
      labName: "Advanced Computing Lab (Room 304)",
      description: "Boot drive failed S.M.A.R.T. self-test.",
      imageUrl: null,
      imagePublicId: null,
      reportedBy: { uid: "user_a", name: "User A", email: "user_a@college.edu" },
      status: "Resolved",
      priority: "Medium",
      aiAnalysis: null,
      assignedTechnician: null,
      assignedAt: null,
      adminNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }, "user_a", "user_a@college.edu")
  );

  // R_N4. User cannot inject pre-filled administrative notes on creation
  await assertFails(
    "Report Negative 4: User cannot inject pre-filled administrative notes on creation",
    createDoc("reports", "hacked_notes", {
      equipmentName: "Dell Precision 3640",
      assetId: "LAB-CS-101",
      labName: "Advanced Computing Lab (Room 304)",
      description: "Boot drive failed S.M.A.R.T. self-test.",
      imageUrl: null,
      imagePublicId: null,
      reportedBy: { uid: "user_a", name: "User A", email: "user_a@college.edu" },
      status: "Reported",
      priority: "Medium",
      aiAnalysis: null,
      assignedTechnician: "Ramesh",
      assignedAt: new Date(),
      adminNotes: "Dispatched without review",
      createdAt: new Date(),
      updatedAt: new Date(),
    }, "user_a", "user_a@college.edu")
  );

  // R_N5. User A cannot read User B's report
  await assertFails(
    "Report Negative 5: User A cannot read User B's report",
    getDoc("reports", "report_user_b", "user_a", "user_a@college.edu")
  );

  // R_N6. Normal user cannot update reports directly
  await assertFails(
    "Report Negative 6: Normal user cannot update reports directly",
    updateDoc("reports", "report_user_b", { status: "Resolved" }, ["status"], "user_a", "user_a@college.edu")
  );

  // R_N7. Normal user cannot delete reports
  await assertFails(
    "Report Negative 7: Normal user cannot delete reports",
    deleteDoc("reports", "report_user_b", "user_a", "user_a@college.edu")
  );

  // R_N8. User cannot create report with invalid or tampered aiAnalysis
  await assertFails(
    "Report Negative 8: User cannot create report with invalid or tampered aiAnalysis",
    createDoc("reports", "invalid_ai_report", {
      equipmentName: "Dell Precision 3640",
      assetId: "LAB-CS-101",
      labName: "Advanced Computing Lab (Room 304)",
      description: "Boot drive failed S.M.A.R.T. self-test with error code 0x8004.",
      imageUrl: null,
      imagePublicId: null,
      reportedBy: {
        uid: "user_a",
        name: "User A Student",
        email: "user_a@college.edu",
      },
      status: "Reported",
      priority: "High",
      aiAnalysis: {
        isAiGenerated: true,
        status: "tampered_illegal_status",
      },
      assignedTechnician: null,
      assignedAt: null,
      adminNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }, "user_a", "user_a@college.edu")
  );

  // R_P1. Authenticated user can create their own valid report with AI analysis
  await assertSucceeds(
    "Report Positive 1: Authenticated user can create valid report with AI analysis",
    createDoc("reports", "valid_report_user_a", {
      equipmentName: "Dell Precision 3640",
      assetId: "LAB-CS-101",
      labName: "Advanced Computing Lab (Room 304)",
      description: "Boot drive failed S.M.A.R.T. self-test with error code 0x8004.",
      imageUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      imagePublicId: "sample_id_123",
      reportedBy: {
        uid: "user_a",
        name: "User A Student",
        email: "user_a@college.edu",
        department: "Computer Science & Engineering",
      },
      status: "Reported",
      priority: "High",
      aiAnalysis: {
        isAiGenerated: true,
        status: "success",
        suggestedCategory: "Hardware",
        suggestedPriority: "High",
        executiveSummary: "Drive controller SMART threshold tripped.",
        possibleRootCause: "SSD block wearout.",
        recommendedAction: "Maintain clearance and wait for technician disk replacement.",
        analyzedAt: new Date().toISOString(),
      },
      assignedTechnician: null,
      assignedAt: null,
      adminNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }, "user_a", "user_a@college.edu")
  );

  // R_P2. Authenticated user can read their own report
  await assertSucceeds(
    "Report Positive 2: Authenticated user can read their own report",
    getDoc("reports", "valid_report_user_a", "user_a", "user_a@college.edu")
  );

  // R_P3. Verified admin can read other users' reports
  await assertSucceeds(
    "Report Positive 3: Verified admin can read other users' reports",
    getDoc("reports", "report_user_b", "admin_user", "admin@college.edu")
  );

  // R_P4. Verified admin can update report status and technician assignment
  await assertSucceeds(
    "Report Positive 4: Verified admin can update report status and technician assignment",
    updateDoc(
      "reports",
      "report_user_b",
      {
        status: "In-Progress",
        assignedTechnician: "Suresh Tech",
        adminNotes: "Dispatched replacement probe to Room 214.",
      },
      ["status", "assignedTechnician", "adminNotes"],
      "admin_user",
      "admin@college.edu"
    )
  );

  // R_P5. Verified admin can delete a report
  await assertSucceeds(
    "Report Positive 5: Verified admin can delete a report",
    deleteDoc("reports", "valid_report_user_a", "admin_user", "admin@college.edu")
  );

  // R_N9. Admin cannot tamper with immutable reporter or equipment fields
  await assertFails(
    "Report Negative 9: Admin cannot overwrite immutable reporter or equipment fields",
    updateDoc(
      "reports",
      "report_user_b",
      {
        equipmentName: "Tampered Rig Name",
      },
      ["equipmentName"],
      "admin_user",
      "admin@college.edu"
    )
  );

  // R_N10. Admin cannot set an invalid status
  await assertFails(
    "Report Negative 10: Admin cannot set an invalid status",
    updateDoc(
      "reports",
      "report_user_b",
      {
        status: "FakeIllegalStatus",
      },
      ["status"],
      "admin_user",
      "admin@college.edu"
    )
  );

  // R_P6. Verified admin can update to Cancelled status
  await assertSucceeds(
    "Report Positive 6: Verified admin can update report to Cancelled status",
    updateDoc(
      "reports",
      "report_user_b",
      {
        status: "Cancelled",
        adminNotes: "Equipment decommissioned.",
      },
      ["status", "adminNotes"],
      "admin_user",
      "admin@college.edu"
    )
  );

  // R_P7. Verified admin can update report category to an approved category
  await assertSucceeds(
    "Report Positive 7: Verified admin can update report category to an approved category",
    updateDoc(
      "reports",
      "report_user_b",
      {
        category: "Power/Electrical",
      },
      ["category"],
      "admin_user",
      "admin@college.edu"
    )
  );

  // R_N11. Admin cannot set an invalid category
  await assertFails(
    "Report Negative 11: Admin cannot set an invalid category",
    updateDoc(
      "reports",
      "report_user_b",
      {
        category: "NuclearHazard",
      },
      ["category"],
      "admin_user",
      "admin@college.edu"
    )
  );

  // R_N12. Admin cannot tamper with aiAnalysis during administrative update
  await assertFails(
    "Report Negative 12: Admin cannot overwrite immutable aiAnalysis during administrative update",
    updateDoc(
      "reports",
      "report_user_b",
      {
        category: "Hardware",
        aiAnalysis: {
          isAiGenerated: true,
          status: "success",
          suggestedCategory: "Hardware",
          suggestedPriority: "Low",
          executiveSummary: "Tampered executive summary",
          possibleRootCause: "Tampered root cause",
          recommendedAction: "Tampered action",
          analyzedAt: new Date().toISOString(),
        },
      },
      ["category", "aiAnalysis"],
      "admin_user",
      "admin@college.edu"
    )
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
