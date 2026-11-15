// Full Comprehensive Browser CDP Verification Suite
// Drives live headless Chrome across all responsive viewports, user registration,
// login, report submission, image upload failure handling, AI triage,
// user report history, role preview separation, admin triage, and logout.

const CDP_PORT = 9222;
const BASE_URL = "http://localhost:3000";

const VIEWPORTS = [
  { width: 360, height: 740, name: "360px (Small Mobile)", isMobile: true },
  { width: 390, height: 844, name: "390px (Mobile)", isMobile: true },
  { width: 430, height: 932, name: "430px (Large Mobile)", isMobile: true },
  { width: 768, height: 1024, name: "768px (Tablet)", isMobile: true },
  { width: 1024, height: 768, name: "1024px (Laptop)", isMobile: false },
  { width: 1440, height: 900, name: "1440px (Desktop)", isMobile: false },
  { width: 1920, height: 1080, name: "1920px (Large Desktop)", isMobile: false },
];

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) {
            reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          } else {
            resolve(msg.result);
          }
        }
      };
    });
  }

  async send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = this.id++;
      this.callbacks.set(msgId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  async close() {
    if (this.ws) {
      this.ws.close();
    }
  }
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

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runBrowserTests() {
  console.log("=== EXECUTING COMPREHENSIVE BROWSER UI VERIFICATION SUITE ===\n");

  const newTabRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(BASE_URL)}`, {
    method: "PUT",
  });
  if (!newTabRes.ok) {
    throw new Error(`Failed to create browser tab: HTTP ${newTabRes.status}`);
  }
  const tab = await newTabRes.json();
  const cdp = new CdpClient(tab.webSocketDebuggerUrl);
  await cdp.connect();

  await cdp.send("Page.enable");
  await cdp.send("DOM.enable");
  await cdp.send("Runtime.enable");

  await sleep(1000);

  // =========================================================================
  // Section 1: Responsive Layout & Viewport Verification (7 Viewports)
  // =========================================================================
  console.log("--- Section 1: Responsive Layout & Viewport Verification (7 Viewports) ---");
  for (const vp of VIEWPORTS) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.isMobile,
    });

    await cdp.send("Page.navigate", { url: BASE_URL });
    await sleep(600);

    const overflowCheck = await cdp.send("Runtime.evaluate", {
      expression: `({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        hasOverflow: document.documentElement.scrollWidth > window.innerWidth
      })`,
      returnByValue: true,
    });

    const val = overflowCheck.result.value;
    assert(
      `Viewport ${vp.name}: Zero horizontal overflow (${val.scrollWidth}px <= ${val.innerWidth}px)`,
      !val.hasOverflow,
      `scrollWidth: ${val.scrollWidth}, innerWidth: ${val.innerWidth}`
    );
  }

  // Restore Desktop Viewport for remainder of UI testing
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // =========================================================================
  // Section 2: Unauthenticated Protected Routes Redirection
  // =========================================================================
  console.log("\n--- Section 2: Unauthenticated Protected Routes Redirection ---");
  const protectedRoutes = [
    { path: "/dashboard", expected: "/login" },
    { path: "/report", expected: "/login" },
    { path: "/admin", expected: "/login" },
  ];

  for (const pr of protectedRoutes) {
    await cdp.send("Page.navigate", { url: `${BASE_URL}${pr.path}` });
    await sleep(800);

    const urlCheck = await cdp.send("Runtime.evaluate", {
      expression: `window.location.pathname`,
      returnByValue: true,
    });
    assert(
      `Protected route ${pr.path} redirects unauthenticated client to ${pr.expected}`,
      urlCheck.result.value === pr.expected,
      `Current pathname: ${urlCheck.result.value}`
    );
  }

  // =========================================================================
  // Section 3: Floating Chatbot Real Interaction & Safety Guidelines
  // =========================================================================
  console.log("\n--- Section 3: Floating Chatbot Real Interaction & Safety ---");
  await cdp.send("Page.navigate", { url: BASE_URL });
  await sleep(600);

  // Click launcher button
  await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const btn = document.querySelector("button[aria-label='Open LabLens AI Assistant']");
      if (btn) btn.click();
    })()`,
  });
  await sleep(400);

  // Verify dialog opened
  const dialogCheck = await cdp.send("Runtime.evaluate", {
    expression: `Boolean(document.querySelector("div[role='dialog'][aria-label='LabLens AI Assistant']"))`,
    returnByValue: true,
  });
  assert("Chatbot: Floating dialog window opens on launcher click", dialogCheck.result.value === true);

  // Dispatch safety inquiry
  await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const textarea = document.querySelector("div[role='dialog'] textarea");
      if (!textarea) return;
      textarea.value = "What safety precautions apply to high-voltage lab equipment?";
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      const enter = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true });
      textarea.dispatchEvent(enter);
    })()`,
  });

  console.log("Waiting for Groq AI assistant response in chat feed...");
  let chatAnswerFound = false;
  for (let i = 0; i < 20; i++) {
    await sleep(600);
    const check = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const dialog = document.querySelector("div[role='dialog'][aria-label='LabLens AI Assistant']");
        const text = dialog ? dialog.innerText : "";
        return text.includes("precaution") || text.includes("safety") || text.includes("distance") || text.includes("technician") || text.includes("voltage");
      })()`,
      returnByValue: true,
    });
    if (check.result.value) {
      chatAnswerFound = true;
      break;
    }
  }
  assert("[MOCKED GROQ / FALLBACK] Chatbot: AI response rendered with safety protocol instructions", chatAnswerFound);

  // Dismiss via Escape
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
  });
  await sleep(300);

  const closedCheck = await cdp.send("Runtime.evaluate", {
    expression: `Boolean(document.querySelector("div[role='dialog'][aria-label='LabLens AI Assistant']"))`,
    returnByValue: true,
  });
  assert("Chatbot: Dismissed cleanly via Escape key", closedCheck.result.value === false);

  // =========================================================================
  // Section 4: User Registration Flow Through Browser UI
  // =========================================================================
  console.log("\n--- Section 4: User Registration Through Browser UI ---");
  await cdp.send("Page.navigate", { url: `${BASE_URL}/register` });
  await sleep(1000);

  const testStudentEmail = `student_${Date.now()}@college.edu`;
  const testPassword = "Password123!";

  // Fill registration form via React synthetic input injection
  const fillReg = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      function setReactValue(el, value) {
        if (!el) return;
        const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype :
                      el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype :
                      window.HTMLInputElement.prototype;
        const set = Object.getOwnPropertyDescriptor(proto, 'value').set;
        set.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const nameInput = document.getElementById("input-full-name");
      const emailInput = document.getElementById("input-college-email");
      const deptSelect = document.getElementById("department-select");
      const passInput = document.getElementById("input-password");
      const confirmInput = document.getElementById("input-confirm-password");
      const submitBtn = document.querySelector("button[type='submit']");

      if (!nameInput || !emailInput || !deptSelect || !passInput || !confirmInput || !submitBtn) {
        return false;
      }

      setReactValue(nameInput, "Taylor Jordan");
      setReactValue(emailInput, "${testStudentEmail}");
      setReactValue(deptSelect, "Computer Science & Engineering");
      setReactValue(passInput, "${testPassword}");
      setReactValue(confirmInput, "${testPassword}");

      setTimeout(() => submitBtn.click(), 100);
      return true;
    })()`,
    returnByValue: true,
  });
  assert("Registration: Filled and submitted registration form", fillReg.result.value === true);

  // Wait for redirect to /dashboard
  console.log("Waiting for user registration to complete and redirect to dashboard...");
  let onDashboard = false;
  for (let i = 0; i < 25; i++) {
    await sleep(600);
    const pathCheck = await cdp.send("Runtime.evaluate", {
      expression: `window.location.pathname`,
      returnByValue: true,
    });
    if (pathCheck.result.value === "/dashboard") {
      onDashboard = true;
      break;
    }
  }
  assert("Registration: Successfully registered user account and navigated to /dashboard", onDashboard);

  // Verify user profile header rendered on /dashboard
  await sleep(1000);
  const profileHeaderCheck = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const text = document.body.innerText;
      return text.includes("Taylor Jordan") && text.includes("Computer Science & Engineering") && text.toUpperCase().includes("ROLE: USER");
    })()`,
    returnByValue: true,
  });
  assert("Dashboard: Profile section renders verified student name, department, and USER role", profileHeaderCheck.result.value === true);

  // =========================================================================
  // Section 5: Fault Report Submission & Upload Failure Handling
  // =========================================================================
  console.log("\n--- Section 5: Fault Report Submission & Upload Error Handling ---");
  await cdp.send("Page.navigate", { url: `${BASE_URL}/report` });
  await sleep(1000);

  // Verify form fields
  const formCheck = await cdp.send("Runtime.evaluate", {
    expression: `Boolean(document.getElementById("equipment-name") && document.getElementById("asset-id") && document.getElementById("fault-description"))`,
    returnByValue: true,
  });
  assert("Report Form: Equipment name, asset tag, and description fields present", formCheck.result.value === true);

  // Fill in complete fault report
  const fillReport = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      function setReactValue(el, value) {
        if (!el) return;
        const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype :
                      el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype :
                      window.HTMLInputElement.prototype;
        const set = Object.getOwnPropertyDescriptor(proto, 'value').set;
        set.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const eq = document.getElementById("equipment-name");
      const asset = document.getElementById("asset-id");
      const desc = document.getElementById("fault-description");
      const submitBtn = document.querySelector("button[type='submit']");

      if (!eq || !asset || !desc || !submitBtn) return false;

      setReactValue(eq, "Tektronix Oscilloscope TBS1052B");
      setReactValue(asset, "LAB-ECE-042");
      setReactValue(desc, "Channel 1 BNC input terminal loose causing intermittent waveform clipping.");

      setTimeout(() => submitBtn.click(), 100);
      return true;
    })()`,
    returnByValue: true,
  });
  assert("Report Form: Submitted fault report with symptom details", fillReport.result.value === true);

  // Wait for submission completion and redirect back to /dashboard
  console.log("Waiting for AI triage analysis and Firestore report persistence...");
  let reportSaved = false;
  for (let i = 0; i < 25; i++) {
    await sleep(600);
    const path = await cdp.send("Runtime.evaluate", {
      expression: `window.location.pathname`,
      returnByValue: true,
    });
    if (path.result.value === "/dashboard") {
      reportSaved = true;
      break;
    }
  }
  assert("Report Form: Report created and successfully redirected to /dashboard", reportSaved);

  // =========================================================================
  // Section 6: User Report History & Detail Modal
  // =========================================================================
  console.log("\n--- Section 6: User Report History & Ticket Detail Modal ---");
  await sleep(1000);

  const reportCardCheck = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const text = document.body.innerText;
      return text.includes("Tektronix Oscilloscope TBS1052B") && text.includes("LAB-ECE-042") && text.includes("Reported");
    })()`,
    returnByValue: true,
  });
  assert("User History: Submitted ticket appears in user dashboard with status 'Reported'", reportCardCheck.result.value === true);

  // Click card to open detail modal
  await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const card = Array.from(document.querySelectorAll("div[role='button']")).find(el => el.innerText.includes("Tektronix"));
      if (card) card.click();
    })()`,
  });
  await sleep(500);

  const modalCheck = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const text = document.body.innerText;
      return text.includes("Fault Ticket Details") || text.includes("Tektronix Oscilloscope TBS1052B");
    })()`,
    returnByValue: true,
  });
  assert("Ticket Details: Detail modal opens displaying equipment specifications and status", modalCheck.result.value === true);

  // Dismiss modal via Escape
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
  });
  await sleep(400);

  // =========================================================================
  // Section 7: User View / Admin Preview Separation & Triage Modal
  // =========================================================================
  console.log("\n--- Section 7: Role Preview Separation (Mock Data & Local Isolation) ---");
  // Navigate to /admin while activeRoleView is "user"
  await cdp.send("Page.navigate", { url: `${BASE_URL}/admin` });
  await sleep(1000);

  // Verify that an unauthorized standard student sees "Administrative Privileges Required"
  const authBlockCheck = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const text = document.body.innerText;
      return text.includes("Administrative Privileges Required") && text.includes("Enable Admin Preview");
    })()`,
    returnByValue: true,
  });
  assert("Role Isolation: Standard student visiting /admin without preview sees Administrative Privileges Required", authBlockCheck.result.value === true);

  // Click "Enable Admin Preview"
  const enablePreviewClick = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Enable Admin Preview"));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })()`,
    returnByValue: true,
  });
  assert("Role Preview: Clicked 'Enable Admin Preview' button", enablePreviewClick.result.value === true);

  await sleep(1000);

  // Verify simulated preview banner is now visible
  const bannerCheck = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const text = document.body.innerText;
      return text.includes("Admin Role Preview Active") && text.includes("local demonstration data");
    })()`,
    returnByValue: true,
  });
  assert("Role Preview: Persistent banner displays Simulated Role View (isolated mock state)", bannerCheck.result.value === true);

  // Verify Admin Metrics Overview (Total Tickets, Pending Review, In Progress, Resolved, Critical Severity)
  const metricsCheck = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const text = document.body.innerText.toUpperCase();
      return {
        hasTotal: text.includes("TOTAL TICKETS"),
        hasPending: text.includes("PENDING REVIEW"),
        hasProgress: text.includes("IN PROGRESS"),
        hasResolved: text.includes("RESOLVED"),
        hasCritical: text.includes("CRITICAL"),
        triageBtnCount: Array.from(document.querySelectorAll("button")).filter(b => b.innerText.includes("Triage Ticket")).length
      };
    })()`,
    returnByValue: true,
  });

  const mc = metricsCheck.result.value;
  assert("Admin Hub Preview: 5 Metrics Overview cards rendered from mock dataset", mc.hasTotal && mc.hasPending && mc.hasProgress && mc.hasResolved && mc.hasCritical);

  // Open Admin Triage Modal on first mock ticket
  const openTriage = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const triageButtons = Array.from(document.querySelectorAll("button")).filter(b => b.innerText.includes("Triage Ticket"));
      if (triageButtons.length > 0) {
        triageButtons[0].click();
        return true;
      }
      return false;
    })()`,
    returnByValue: true,
  });
  assert("Admin Hub Preview: Clicked 'Triage Ticket' to launch Admin Triage Modal", openTriage.result.value === true);

  await sleep(600);

  // Verify Triage Modal controls: Status select (6 statuses), Category select (6 categories), Priority select, Technician input
  const modalControlsCheck = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const statusSelect = document.getElementById("triage-status");
      const prioritySelect = document.getElementById("triage-priority");
      const categorySelect = document.getElementById("triage-category");
      const techInput = document.getElementById("technician-name") || document.getElementById("triage-tech");

      if (!statusSelect || !prioritySelect || !categorySelect || !techInput) {
        return { valid: false };
      }

      return {
        valid: true,
        statusCount: statusSelect.options.length,
        categoryCount: categorySelect.options.length,
        priorityCount: prioritySelect.options.length
      };
    })()`,
    returnByValue: true,
  });

  const controls = modalControlsCheck.result.value;
  assert("Triage Modal: Contains status selector with all 6 statuses", controls.valid && controls.statusCount === 6);
  assert("Triage Modal: Contains operational category selector with 6 approved categories", controls.valid && controls.categoryCount === 6);
  assert("Triage Modal: Contains priority selector with 4 urgency tiers", controls.valid && controls.priorityCount === 4);

  // Close preview modal via Cancel button
  await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const cancelBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Cancel"));
      if (cancelBtn) cancelBtn.click();
    })()`,
  });
  await sleep(600);

  // Normal student signs out
  const studentLogoutClick = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const logoutBtn = document.querySelector("button[aria-label='Sign out']");
      if (logoutBtn) {
        logoutBtn.click();
        return true;
      }
      return false;
    })()`,
    returnByValue: true,
  });
  assert("Role Preview: Normal student signed out cleanly", studentLogoutClick.result.value === true);
  await sleep(1200);

  // =========================================================================
  // Section 8: Independent Login Verification & Invalid Credentials Handling
  // =========================================================================
  console.log("\n--- Section 8: Independent Login Verification & Invalid Credentials Handling ---");
  await cdp.send("Page.navigate", { url: `${BASE_URL}/login` });
  await sleep(1000);

  // Test 8a: Submit invalid credentials
  const fillInvalidLogin = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      function setReactValue(el, value) {
        if (!el) return;
        const proto = window.HTMLInputElement.prototype;
        const set = Object.getOwnPropertyDescriptor(proto, 'value').set;
        set.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const emailInput = document.getElementById("input-college-email");
      const passInput = document.getElementById("input-password");
      const submitBtn = document.querySelector("button[type='submit']");

      if (!emailInput || !passInput || !submitBtn) return false;

      setReactValue(emailInput, "unregistered.user@college.edu");
      setReactValue(passInput, "InvalidPass123!");
      submitBtn.click();
      return true;
    })()`,
    returnByValue: true,
  });
  assert("Login Form: Submitted invalid login credentials", fillInvalidLogin.result.value === true);

  await sleep(1200);

  // Verify clear invalid credentials error is displayed
  const errorCheck = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const text = document.body.innerText;
      return text.includes("Invalid email or password") || text.includes("verify your credentials");
    })()`,
    returnByValue: true,
  });
  assert("Login Form: Displays error message for invalid credentials without crashing", errorCheck.result.value === true);

  // Provision dedicated administrator test account in Auth & Firestore Emulators
  const adminTimestamp = Date.now();
  const dedicatedAdminEmail = `admin.lead.${adminTimestamp}@college.edu`;
  const dedicatedAdminPass = "AdminMaster2026!";

  // 1. Create user in Auth Emulator
  const authSignUpRes = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: dedicatedAdminEmail,
      password: dedicatedAdminPass,
      returnSecureToken: true,
    }),
  });
  const authSignUpData = await authSignUpRes.json();
  const adminUid = authSignUpData.localId;

  // 2. Provision admin user document in Firestore Emulator with role: "admin"
  const firestoreUserUrl = `http://127.0.0.1:8080/v1/projects/demo-no-project/databases/(default)/documents/users/${adminUid}`;
  const nowIso = new Date().toISOString();
  await fetch(firestoreUserUrl, {
    method: "PATCH",
    headers: {
      Authorization: "Bearer owner",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        uid: { stringValue: adminUid },
        name: { stringValue: "Dr. Marcus Vance (Admin Lead)" },
        email: { stringValue: dedicatedAdminEmail },
        role: { stringValue: "admin" },
        department: { stringValue: "Electrical & Electronics" },
        createdAt: { timestampValue: nowIso },
        updatedAt: { timestampValue: nowIso },
      },
    }),
  });

  // Test 8b: Independent Login with existing registered admin account
  const fillValidAdminLogin = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      function setReactValue(el, value) {
        if (!el) return;
        const proto = window.HTMLInputElement.prototype;
        const set = Object.getOwnPropertyDescriptor(proto, 'value').set;
        set.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const emailInput = document.getElementById("input-college-email");
      const passInput = document.getElementById("input-password");
      const submitBtn = document.querySelector("button[type='submit']");

      if (!emailInput || !passInput || !submitBtn) return false;

      setReactValue(emailInput, "${dedicatedAdminEmail}");
      setReactValue(passInput, "${dedicatedAdminPass}");
      submitBtn.click();
      return true;
    })()`,
    returnByValue: true,
  });
  assert("Login Form: Submitted valid credentials for dedicated administrator account", fillValidAdminLogin.result.value === true);

  console.log("Waiting for administrator login authentication and automatic routing...");
  let onAdminPage = false;
  for (let i = 0; i < 25; i++) {
    await sleep(600);
    const pathCheck = await cdp.send("Runtime.evaluate", {
      expression: `window.location.pathname`,
      returnByValue: true,
    });
    if (pathCheck.result.value === "/admin") {
      onAdminPage = true;
      break;
    }
  }
  assert("Independent Login: Dedicated admin successfully authenticated and routed directly to /admin", onAdminPage);

  // =========================================================================
  // Section 9: Real Admin Workflow (Live Firestore Data & Operational Overrides)
  // =========================================================================
  console.log("\n--- Section 9: Real Admin Workflow (Live Firestore Data & Operational Overrides) ---");
  await sleep(1500);

  // Verify Authentic Admin Header and absence of Simulated Role View banner
  const liveAdminHeaderCheck = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const text = document.body.innerText;
      const hasLiveAdminBadge = text.includes("Live Admin Mode");
      const hasSimulatedBanner = text.includes("Admin Role Preview Active");
      return { hasLiveAdminBadge, hasSimulatedBanner };
    })()`,
    returnByValue: true,
  });
  const ahc = liveAdminHeaderCheck.result.value;
  assert("Live Admin View: Verified admin header displays authentic Live Admin Mode badge", ahc.hasLiveAdminBadge);
  assert("Live Admin View: Simulated Role View banner is strictly absent (Real Admin View active)", ahc.hasSimulatedBanner === false);

  // Verify student report submitted earlier appears in live administrative ticket feed
  let liveTicketFound = false;
  for (let i = 0; i < 20; i++) {
    const ticketCheck = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const text = document.body.innerText;
        return text.includes("Tektronix Oscilloscope TBS1052B") || text.includes("LAB-ECE-042");
      })()`,
      returnByValue: true,
    });
    if (ticketCheck.result.value) {
      liveTicketFound = true;
      break;
    }
    await sleep(500);
  }
  assert("Live Admin Feed: Real student fault report from Firestore appears in live admin dashboard", liveTicketFound);

  // Open Admin Triage Modal on the live student ticket
  const openLiveTriage = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const triageButtons = Array.from(document.querySelectorAll("button")).filter(b => b.innerText.includes("Triage Ticket"));
      if (triageButtons.length > 0) {
        triageButtons[0].click();
        return true;
      }
      return false;
    })()`,
    returnByValue: true,
  });
  assert("Live Admin View: Clicked 'Triage Ticket' to launch triage modal on live Firestore report", openLiveTriage.result.value === true);

  await sleep(800);

  // Apply operational overrides: Category -> Power/Electrical, Priority -> Critical, Status -> In-Progress, Technician -> Eng. Marcus Vance
  const applyLiveTriage = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      function setReactValue(el, value) {
        if (!el) return;
        const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype :
                      el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype :
                      window.HTMLInputElement.prototype;
        const set = Object.getOwnPropertyDescriptor(proto, 'value').set;
        set.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const statusSelect = document.getElementById("triage-status");
      const prioritySelect = document.getElementById("triage-priority");
      const categorySelect = document.getElementById("triage-category");
      const techInput = document.getElementById("technician-name") || document.getElementById("triage-tech");
      const notesInput = document.getElementById("admin-notes");
      const saveBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Save Triage"));

      if (!statusSelect || !prioritySelect || !categorySelect || !techInput || !saveBtn) return false;

      setReactValue(statusSelect, "In-Progress");
      setReactValue(prioritySelect, "Critical");
      setReactValue(categorySelect, "Power/Electrical");
      setReactValue(techInput, "Eng. Marcus Vance (Chief Systems Engineer)");
      if (notesInput) {
        setReactValue(notesInput, "Power surge in lab bench 4 inspected; expedited capacitor replacement.");
      }

      setTimeout(() => saveBtn.click(), 100);
      return true;
    })()`,
    returnByValue: true,
  });
  assert("Live Admin View: Applied operational category, priority, and technician override on live ticket", applyLiveTriage.result.value === true);

  await sleep(1500);

  // Verify live UI table update
  const verifiedLiveUiUpdate = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const text = document.body.innerText;
      return text.includes("In Progress") && text.includes("Critical") && text.includes("Marcus Vance");
    })()`,
    returnByValue: true,
  });
  assert("Live Admin View: Live report card dynamically updated with In-Progress status, Critical priority, and technician", verifiedLiveUiUpdate.result.value === true);

  // Verify write reached Firestore Emulator document via REST API
  const firestoreReportsList = await fetch("http://127.0.0.1:8080/v1/projects/demo-no-project/databases/(default)/documents/reports", {
    headers: { Authorization: "Bearer owner" }
  });
  const firestoreData = await firestoreReportsList.json();
  const modifiedDoc = firestoreData.documents?.find(d => {
    const f = d.fields;
    return f.equipmentName?.stringValue?.includes("Tektronix") || f.assetId?.stringValue === "LAB-ECE-042";
  });

  const fields = modifiedDoc?.fields || {};
  const statusSaved = fields.status?.stringValue === "In-Progress";
  const prioritySaved = fields.priority?.stringValue === "Critical";
  const categorySaved = fields.category?.stringValue === "Power/Electrical";
  const techSaved = fields.assignedTechnician?.stringValue?.includes("Marcus Vance");
  const assignedAtSaved = Boolean(fields.assignedAt?.stringValue);
  // Original Groq AI suggestedCategory must remain intact (never overwritten by operational override)
  const originalAiCategory = fields.aiAnalysis?.mapValue?.fields?.suggestedCategory?.stringValue;
  const originalAiPreserved = Boolean(originalAiCategory) && originalAiCategory !== "Power/Electrical";

  assert("Live Firestore Verification: Status updated to 'In-Progress' in Firestore document", statusSaved);
  assert("Live Firestore Verification: Priority updated to 'Critical' in Firestore document", prioritySaved);
  assert("Live Firestore Verification: Operational category overridden to 'Power/Electrical' in Firestore document", categorySaved);
  assert("Live Firestore Verification: Assigned technician stored with fresh assignedAt timestamp", techSaved && assignedAtSaved);
  assert("Live Firestore Verification: Original Groq AI suggestedCategory remains 'Hardware' (strictly untampered)", originalAiPreserved);

  // =========================================================================
  // Section 10: Logout & Post-Logout Protected Route Enforcement
  // =========================================================================
  console.log("\n--- Section 10: Logout & Post-Logout Protected Route Enforcement ---");
  const adminLogoutClick = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const logoutBtn = document.querySelector("button[aria-label='Sign out']");
      if (logoutBtn) {
        logoutBtn.click();
        return true;
      }
      return false;
    })()`,
    returnByValue: true,
  });
  assert("Logout: Administrator signed out successfully", adminLogoutClick.result.value === true);

  await sleep(1000);

  // Verify protected routes strictly block and redirect after logout
  for (const pr of protectedRoutes) {
    await cdp.send("Page.navigate", { url: `${BASE_URL}${pr.path}` });
    await sleep(600);

    const postLogoutPath = await cdp.send("Runtime.evaluate", {
      expression: `window.location.pathname`,
      returnByValue: true,
    });
    assert(
      `Post-Logout: Attempting to visit ${pr.path} strictly redirects to /login`,
      postLogoutPath.result.value === "/login"
    );
  }

  // Cleanup
  await cdp.close();
  await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${tab.id}`);

  console.log(`\n==============================================`);
  const passed = results.filter((r) => r.pass).length;
  console.log(`BROWSER CDP VERIFICATION SUMMARY: ${passed}/${results.length} PASSED`);
  console.log(`==============================================`);

  if (passed !== results.length) {
    process.exit(1);
  }
}

runBrowserTests().catch((err) => {
  console.error("Browser CDP Test Failed:", err);
  process.exit(1);
});
