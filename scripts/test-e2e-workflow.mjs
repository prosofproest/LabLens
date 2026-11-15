// E2E Lifecycle & Security Verification Test Suite
// Executes against live Firebase Emulator to test full multi-step workflows,
// technician reassignment timestamps, category & priority overrides, AI immutability,
// and role authorization transitions.

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

function fromFirestoreFields(fields) {
  const result = {};
  for (const [key, valObj] of Object.entries(fields)) {
    if ("nullValue" in valObj) result[key] = null;
    else if ("stringValue" in valObj) result[key] = valObj.stringValue;
    else if ("integerValue" in valObj) result[key] = parseInt(valObj.integerValue, 10);
    else if ("booleanValue" in valObj) result[key] = valObj.booleanValue;
    else if ("timestampValue" in valObj) result[key] = valObj.timestampValue;
    else if ("mapValue" in valObj && valObj.mapValue.fields) {
      result[key] = fromFirestoreFields(valObj.mapValue.fields);
    }
  }
  return result;
}

async function seedDoc(collection, docId, data) {
  const url = `${BASE}/${collection}/${docId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: "Bearer owner",
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
  const maskParams = updateMask.map((m) => `updateMask.fieldPaths=${m}`).join("&");
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

const results = [];

function assert(name, condition, details = "") {
  if (condition) {
    console.log(`[PASS] ${name}`);
    results.push({ name, pass: true });
  } else {
    console.error(`[FAIL] ${name} — ${details}`);
    results.push({ name, pass: false });
  }
}

async function runE2ESuite() {
  console.log("=== EXECUTING E2E INTEGRATION & STATUS LIFECYCLE WORKFLOW SUITE ===");

  const studentUid = "e2e_student";
  const studentEmail = "e2e_student@college.edu";
  const adminUid = "e2e_admin";
  const adminEmail = "e2e_admin@college.edu";

  // 1. Setup Profiles
  await seedDoc("users", studentUid, {
    uid: studentUid,
    name: "Alex Rivera",
    email: studentEmail,
    role: "user",
    department: "Computer Science & Engineering",
    createdAt: new Date(),
  });

  await seedDoc("users", adminUid, {
    uid: adminUid,
    name: "Chief Lab Admin",
    email: adminEmail,
    role: "admin",
    department: "Information Technology",
    createdAt: new Date(),
  });

  console.log("\n--- Step 1: Student Ticket Creation with Mocked Groq AI Analysis ---");
  const mockedGroqAnalysis = {
    isAiGenerated: true,
    status: "success",
    suggestedCategory: "Hardware",
    suggestedPriority: "Medium",
    executiveSummary: "GPU fan bearing failure causing thermal throttle.",
    possibleRootCause: "Mechanical wear and dust accumulation in bearing housing.",
    recommendedAction: "Maintain distance, keep workstation powered down, await hardware technician.",
    analyzedAt: new Date().toISOString(),
  };

  const reportId = "e2e_report_001";
  const createPayload = {
    equipmentName: "Precision 3650 Workstation #14",
    assetId: "LAB-CS-014",
    labName: "Advanced Computing Lab (Room 304)",
    description: "GPU fan bearing failed with rattling noise followed by thermal shutdown.",
    category: "Hardware",
    imageUrl: "https://res.cloudinary.com/demo/image/upload/sample_fault.jpg",
    imagePublicId: "sample_fault_014",
    status: "Reported",
    priority: "Medium",
    reportedBy: {
      uid: studentUid,
      name: "Alex Rivera",
      email: studentEmail,
      department: "Computer Science & Engineering",
    },
    aiAnalysis: mockedGroqAnalysis,
    assignedTechnician: null,
    assignedAt: null,
    adminNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createRes = await createDoc("reports", reportId, createPayload, studentUid, studentEmail);
  assert("E2E 1a: Student successfully creates fault report", createRes.status === 200, `Got HTTP ${createRes.status}`);

  const getStudentRes = await getDoc("reports", reportId, studentUid, studentEmail);
  const studentDocData = await getStudentRes.json();
  const fields1 = fromFirestoreFields(studentDocData.fields);
  assert("E2E 1b: Student can read their own report", fields1.status === "Reported" && fields1.assetId === "LAB-CS-014");

  console.log("\n--- Step 2: Complete Status Lifecycle Traversal (All 6 Statuses) ---");
  
  // Transition 1: Reported -> In-Review
  const inReviewRes = await updateDoc("reports", reportId, { status: "In-Review" }, ["status"], adminUid, adminEmail);
  assert("E2E 2a: Admin updates status to 'In-Review'", inReviewRes.status === 200, `Got HTTP ${inReviewRes.status}`);

  // Transition 2: In-Review -> Assigned (with first technician)
  const assignTime1 = new Date().toISOString();
  const assignedRes = await updateDoc(
    "reports",
    reportId,
    {
      status: "Assigned",
      assignedTechnician: "Priya Sharma (Network Specialist)",
      assignedAt: assignTime1,
      adminNotes: "Dispatched Priya for initial hardware inspection.",
    },
    ["status", "assignedTechnician", "assignedAt", "adminNotes"],
    adminUid,
    adminEmail
  );
  assert("E2E 2b: Admin assigns technician with fresh timestamp", assignedRes.status === 200, `Got HTTP ${assignedRes.status}`);

  // Transition 3: Reassign technician (Technician changed -> Fresh timestamp)
  const assignTime2 = new Date(Date.now() + 5000).toISOString();
  const reassignRes = await updateDoc(
    "reports",
    reportId,
    {
      assignedTechnician: "Ramesh Kumar (Hardware Specialist)",
      assignedAt: assignTime2,
      adminNotes: "Reassigned to Hardware Specialist for bearing replacement.",
    },
    ["assignedTechnician", "assignedAt", "adminNotes"],
    adminUid,
    adminEmail
  );
  assert("E2E 2c: Admin reassigns technician with fresh updated timestamp", reassignRes.status === 200, `Got HTTP ${reassignRes.status}`);

  // Transition 4: Assigned -> In-Progress
  const inProgressRes = await updateDoc("reports", reportId, { status: "In-Progress" }, ["status"], adminUid, adminEmail);
  assert("E2E 2d: Admin updates status to 'In-Progress'", inProgressRes.status === 200, `Got HTTP ${inProgressRes.status}`);

  console.log("\n--- Step 3: Admin Operational Category & Priority Overrides ---");
  // Admin overrides Category to 'Power/Electrical' and Priority to 'High'
  const overrideRes = await updateDoc(
    "reports",
    reportId,
    {
      category: "Power/Electrical",
      priority: "High",
      adminNotes: "Inspection found shorted capacitor on auxiliary PCIe power line.",
    },
    ["category", "priority", "adminNotes"],
    adminUid,
    adminEmail
  );
  assert("E2E 3a: Admin overrides category and priority", overrideRes.status === 200, `Got HTTP ${overrideRes.status}`);

  // Verify Firestore document contents: Category and priority updated, but aiAnalysis preserved
  const verifyDocRes = await getDoc("reports", reportId, adminUid, adminEmail);
  const verifyData = fromFirestoreFields((await verifyDocRes.json()).fields);
  assert(
    "E2E 3b: Operational category updated to Power/Electrical",
    verifyData.category === "Power/Electrical" && verifyData.priority === "High"
  );
  assert(
    "E2E 3c: Original Groq AI suggestedCategory remains 'Hardware' (strictly untampered)",
    verifyData.aiAnalysis.suggestedCategory === "Hardware" && verifyData.aiAnalysis.suggestedPriority === "Medium"
  );

  console.log("\n--- Step 4: Resolution & Cancellation ---");
  // Transition 5: In-Progress -> Resolved
  const resolvedRes = await updateDoc(
    "reports",
    reportId,
    {
      status: "Resolved",
      adminNotes: "Capacitor and fan assembly replaced. Stress test passed.",
    },
    ["status", "adminNotes"],
    adminUid,
    adminEmail
  );
  assert("E2E 4a: Admin transitions ticket to 'Resolved'", resolvedRes.status === 200, `Got HTTP ${resolvedRes.status}`);

  // Transition 6: Resolved -> Cancelled (full coverage of 6th status)
  const cancelledRes = await updateDoc(
    "reports",
    reportId,
    {
      status: "Cancelled",
      adminNotes: "Workstation subsequently retired per hardware lifecycle plan.",
    },
    ["status", "adminNotes"],
    adminUid,
    adminEmail
  );
  assert("E2E 4b: Admin transitions ticket to 'Cancelled'", cancelledRes.status === 200, `Got HTTP ${cancelledRes.status}`);

  console.log("\n--- Step 5: Security & Immutable Protections ---");
  // Negative 1: Regular user cannot perform administrative status update
  const unauthUpdateRes = await updateDoc("reports", reportId, { status: "Resolved" }, ["status"], studentUid, studentEmail);
  assert("E2E 5a: Non-admin cannot perform administrative status update (Blocked HTTP 403)", unauthUpdateRes.status === 403);

  // Negative 2: Regular user cannot delete ticket
  const unauthDeleteRes = await deleteDoc("reports", reportId, studentUid, studentEmail);
  assert("E2E 5b: Non-admin cannot delete ticket (Blocked HTTP 403)", unauthDeleteRes.status === 403);

  // Negative 3: Admin cannot overwrite immutable reporter or equipment fields
  const tamperedEquipmentRes = await updateDoc("reports", reportId, { equipmentName: "Tampered Equipment" }, ["equipmentName"], adminUid, adminEmail);
  assert("E2E 5c: Admin cannot overwrite immutable equipmentName (Blocked HTTP 403)", tamperedEquipmentRes.status === 403);

  console.log("\n--- Step 6: Administrative Ticket Deletion ---");
  const deleteRes = await deleteDoc("reports", reportId, adminUid, adminEmail);
  assert("E2E 6a: Verified admin deletes cancelled ticket", deleteRes.status === 200, `Got HTTP ${deleteRes.status}`);

  const postDeleteRes = await getDoc("reports", reportId, adminUid, adminEmail);
  assert("E2E 6b: Ticket confirmed deleted (HTTP 404)", postDeleteRes.status === 404);

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n==============================================`);
  console.log(`E2E INTEGRATION SUITE SUMMARY: ${passed}/${results.length} PASSED`);
  console.log(`==============================================`);

  if (passed !== results.length) {
    process.exit(1);
  }
}

runE2ESuite().catch((err) => {
  console.error("E2E Test Execution Error:", err);
  process.exit(1);
});

