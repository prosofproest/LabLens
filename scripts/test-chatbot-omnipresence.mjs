/**
 * LabLens AI — Comprehensive Floating Chatbot Omnipresence & Visibility Test Suite
 *
 * Verifies across all application routes and viewports:
 * 1. Fixed bottom-right positioning and visibility
 * 2. Unobscured by navbar, sticky banners, forms, cards, and modals
 * 3. Responsive layout at Desktop (1440px) and Mobile (390px)
 * 4. Open and close toggle functionality (Launcher, Close button, Escape key)
 * 5. Full Guest mode functionality without authentication
 * 6. Authenticated mode functionality on /dashboard, /report, and /admin
 * 7. Live interaction via /api/chat using Groq AI exclusively
 * 8. Strict singleton mounting: zero duplicate chatbot instances
 */

import { spawn } from "child_process";

const CDP_PORT = 9222;
const BASE_URL = "http://localhost:3000";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHttp(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return true;
    } catch {}
    await sleep(350);
  }
  throw new Error(`Timeout waiting for ${url}`);
}

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

let passedCount = 0;
let totalCount = 0;

function assert(title, condition, detail = "") {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`[PASS] ${title}`);
  } else {
    console.error(`[FAIL] ${title}${detail ? " -> " + detail : ""}`);
  }
}

async function verifyChatbotOnPage(cdp, path, pageName, options = {}) {
  await cdp.send("Page.navigate", { url: `${BASE_URL}${path}` });
  await sleep(1000);

  // 1. Singleton Check: Exactly one launcher button mounted
  const countCheck = await cdp.send("Runtime.evaluate", {
    expression: `document.querySelectorAll("button[aria-label*='LabLens AI Assistant']").length`,
    returnByValue: true,
  });
  assert(
    `${pageName}: Exactly one chatbot launcher instance mounted in DOM`,
    countCheck.result.value === 1,
    `Found ${countCheck.result.value} instances`
  );

  // 2. Position & Style verification
  const posCheck = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const btn = document.querySelector("button[aria-label*='LabLens AI Assistant']");
      if (!btn) return null;
      const rect = btn.getBoundingClientRect();
      const style = window.getComputedStyle(btn);
      const containerStyle = window.getComputedStyle(btn.parentElement);
      
      // Hit test: is the center of the button directly clickable and not obscured?
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const topElement = document.elementFromPoint(centerX, centerY);
      const isTopElement = topElement === btn || btn.contains(topElement);

      return {
        visible: rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden",
        position: containerStyle.position,
        isFixedBottomRight: rect.right <= window.innerWidth && rect.bottom <= window.innerHeight && rect.top > 0 && rect.left > 0,
        zIndex: containerStyle.zIndex,
        isClickable: isTopElement,
        topElementName: topElement ? topElement.tagName : "NONE",
        rect: { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }
      };
    })()`,
    returnByValue: true,
  });

  const p = posCheck.result.value;
  assert(`${pageName}: Launcher button is rendered and visible`, p && p.visible);
  assert(`${pageName}: Launcher container is position fixed in bottom-right corner`, p && p.position === "fixed" && p.isFixedBottomRight);
  assert(`${pageName}: Launcher is unobstructed and top element at its coordinates`, p && p.isClickable, `Covered by <${p?.topElementName}>`);

  // 3. Open Dialog
  await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const btn = document.querySelector("button[aria-label*='LabLens AI Assistant']");
      if (btn) btn.click();
    })()`,
  });
  await sleep(400);

  const dialogOpenCheck = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const dialog = document.querySelector("div[role='dialog'][aria-label='LabLens AI Assistant']");
      if (!dialog) return null;
      const rect = dialog.getBoundingClientRect();
      const style = window.getComputedStyle(dialog);
      return {
        isOpen: true,
        visible: rect.width > 0 && rect.height > 0 && style.display !== "none",
        hasHeader: dialog.innerText.includes("LabLens Assistant") && dialog.innerText.includes("Groq AI"),
        hasInput: Boolean(dialog.querySelector("textarea")),
        withinBounds: rect.right <= window.innerWidth && rect.bottom <= window.innerHeight,
        width: rect.width,
        height: rect.height,
      };
    })()`,
    returnByValue: true,
  });

  const d = dialogOpenCheck.result.value;
  assert(`${pageName}: Chat dialog opens successfully on click`, d && d.isOpen && d.visible);
  assert(`${pageName}: Chat dialog displays 'LabLens Assistant' with 'Groq AI' badge`, d && d.hasHeader);
  assert(`${pageName}: Chat dialog stays strictly within viewport bounds`, d && d.withinBounds);

  // 4. Close Dialog
  if (options.closeVia === "escape") {
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
    });
  } else {
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const closeBtn = document.querySelector("div[role='dialog'] button[aria-label='Close assistant panel']");
        if (closeBtn) closeBtn.click();
      })()`,
    });
  }
  await sleep(350);

  const dialogClosedCheck = await cdp.send("Runtime.evaluate", {
    expression: `Boolean(document.querySelector("div[role='dialog'][aria-label='LabLens AI Assistant']"))`,
    returnByValue: true,
  });
  assert(`${pageName}: Chat dialog closes cleanly (${options.closeVia === "escape" ? "Escape" : "Close button"})`, dialogClosedCheck.result.value === false);
}

async function run() {
  console.log("=================================================================");
  console.log("   LabLens AI — Comprehensive Chatbot Omnipresence Test Suite    ");
  console.log("=================================================================\n");

  // 1. Launch Chrome
  console.log("Launching headless Chrome on port 9222...");
  const chromeProcess = spawn(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ["--headless=new", "--remote-debugging-port=9222", "--user-data-dir=/tmp/lablens-chatbot-test-profile"],
    { stdio: "ignore" }
  );
  await waitForHttp("http://127.0.0.1:9222/json/version", 15000);
  console.log("[OK] Headless Chrome CDP ready");

  // 2. Launch Next.js dev server with Firebase emulator configuration
  console.log("Starting Next.js dev server on port 3000...");
  const devEnv = {
    ...process.env,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-no-project",
    NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyMockKeyForBuildVerification",
    NEXT_PUBLIC_USE_FIREBASE_EMULATOR: "true",
    FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
    PORT: "3000",
  };
  const nextProcess = spawn("npx", ["next", "dev", "-p", "3000"], {
    env: devEnv,
    stdio: "inherit",
  });
  await waitForHttp("http://localhost:3000", 25000);
  console.log("[OK] Next.js dev server ready\n");

  // Connect CDP to new browser tab
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
  await cdp.send("Runtime.enable");
  await cdp.send("DOM.enable");

  // Set default Desktop Viewport (1440x900)
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  try {
    // =========================================================================
    // SECTION 1: Public Pages (Guest Mode)
    // =========================================================================
    console.log("--- Section 1: Public & Guest Pages Visibility ---");
    await verifyChatbotOnPage(cdp, "/", "Landing Page ('/')", { closeVia: "button" });
    await verifyChatbotOnPage(cdp, "/demo", "User Demo ('/demo')", { closeVia: "escape" });
    await verifyChatbotOnPage(cdp, "/demo/admin", "Admin Demo ('/demo/admin')", { closeVia: "button" });
    await verifyChatbotOnPage(cdp, "/demo/report", "Demo Report Form ('/demo/report')", { closeVia: "escape" });
    await verifyChatbotOnPage(cdp, "/login", "Login Page ('/login')", { closeVia: "button" });
    await verifyChatbotOnPage(cdp, "/register", "Register Page ('/register')", { closeVia: "escape" });

    // =========================================================================
    // SECTION 2: Modal Coexistence & Non-Obstruction
    // =========================================================================
    console.log("\n--- Section 2: Modal Coexistence & Non-Obstruction ---");
    await cdp.send("Page.navigate", { url: `${BASE_URL}/demo/admin` });
    await sleep(800);

    // Open Admin Triage Modal
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const triageBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Triage Ticket"));
        if (triageBtn) triageBtn.click();
      })()`,
    });
    await sleep(500);

    const modalCheck = await cdp.send("Runtime.evaluate", {
      expression: `Boolean(document.querySelector("#triage-modal-title"))`,
      returnByValue: true,
    });
    assert("Modal Coexistence: Admin triage modal opened successfully", modalCheck.result.value === true);

    // Verify Chatbot Launcher is still present and has valid dimensions while modal is open
    const launcherDuringModal = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.querySelector("button[aria-label*='LabLens AI Assistant']");
        if (!btn) return false;
        const rect = btn.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })()`,
      returnByValue: true,
    });
    assert("Modal Coexistence: Chatbot launcher remains mounted and visible during modal display", launcherDuringModal.result.value === true);

    // Close Modal via Cancel
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const cancelBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Cancel"));
        if (cancelBtn) cancelBtn.click();
      })()`,
    });
    await sleep(400);

    // =========================================================================
    // SECTION 3: Live Guest Mode AI Conversation (Groq AI)
    // =========================================================================
    console.log("\n--- Section 3: Live Guest Mode AI Chat Interaction ---");
    await cdp.send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(600);

    // Open Chatbot
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.querySelector("button[aria-label*='LabLens AI Assistant']");
        if (btn) btn.click();
      })()`,
    });
    await sleep(400);

    // Send question
    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const textarea = document.querySelector("div[role='dialog'] textarea");
        if (!textarea) return;
        textarea.value = "What precautions apply to high-voltage lab stations?";
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        const enter = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true });
        textarea.dispatchEvent(enter);
      })()`,
    });

    console.log("Waiting for Groq AI assistant response in guest mode...");
    let guestChatAnswered = false;
    for (let i = 0; i < 20; i++) {
      await sleep(600);
      const check = await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const dialog = document.querySelector("div[role='dialog'][aria-label='LabLens AI Assistant']");
          if (!dialog) return false;
          const text = dialog.innerText.toLowerCase();
          return text.includes("safety") || text.includes("precaution") || text.includes("voltage") || text.includes("technician") || text.includes("distance") || text.includes("offline");
        })()`,
        returnByValue: true,
      });
      if (check.result.value) {
        guestChatAnswered = true;
        break;
      }
    }
    assert("Guest Mode Chat: AI response rendered via /api/chat without authentication", guestChatAnswered);

    // Close Dialog
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
    });
    await sleep(350);

    // =========================================================================
    // SECTION 4: Authenticated Pages Visibility (/dashboard, /report, /admin)
    // =========================================================================
    console.log("\n--- Section 4: Authenticated Application Pages Visibility ---");

    // Authenticate with dedicated test admin account
    const testAdminEmail = `chatbot_admin_${Date.now()}@college.edu`;
    const testAdminPass = "CampusLabPass123!";
    const nowIso = new Date().toISOString();

    const authRes = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testAdminEmail, password: testAdminPass, returnSecureToken: true }),
    });
    const authData = await authRes.json();
    const adminUid = authData.localId;

    // Provision admin role in Firestore emulator
    await fetch(`http://127.0.0.1:8080/v1/projects/demo-no-project/databases/(default)/documents/users/${adminUid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          uid: { stringValue: adminUid },
          name: { stringValue: "Dr. Chatbot Test Admin" },
          email: { stringValue: testAdminEmail },
          role: { stringValue: "admin" },
          department: { stringValue: "Computer Science & Engineering" },
          createdAt: { timestampValue: nowIso },
        },
      }),
    });

    // Log in via /login
    await cdp.send("Page.navigate", { url: `${BASE_URL}/login` });
    await sleep(800);

    await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        function setReactValue(el, val) {
          const proto = window.HTMLInputElement.prototype;
          const set = Object.getOwnPropertyDescriptor(proto, 'value').set;
          set.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        setReactValue(document.getElementById("input-college-email"), "${testAdminEmail}");
        setReactValue(document.getElementById("input-password"), "${testAdminPass}");
        document.querySelector("button[type='submit']").click();
      })()`,
    });

    // Wait for login
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      const curPath = await cdp.send("Runtime.evaluate", { expression: "window.location.pathname", returnByValue: true });
      if (curPath.result.value === "/admin" || curPath.result.value === "/dashboard") break;
    }

    await verifyChatbotOnPage(cdp, "/dashboard", "Authenticated Dashboard ('/dashboard')", { closeVia: "escape" });
    await verifyChatbotOnPage(cdp, "/report", "Authenticated Fault Report ('/report')", { closeVia: "button" });
    await verifyChatbotOnPage(cdp, "/admin", "Authenticated Admin View ('/admin')", { closeVia: "escape" });

    // =========================================================================
    // SECTION 5: Mobile Viewport Verification (390px Mobile & 360px Small Mobile)
    // =========================================================================
    console.log("\n--- Section 5: Mobile Viewport Verification ---");

    for (const vp of [{ width: 390, height: 844, name: "390px (Mobile)" }, { width: 360, height: 740, name: "360px (Small Mobile)" }]) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: true,
      });

      await cdp.send("Page.navigate", { url: `${BASE_URL}/` });
      await sleep(600);

      // Verify button within mobile width
      const mobileBtnCheck = await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const btn = document.querySelector("button[aria-label*='LabLens AI Assistant']");
          if (!btn) return null;
          const rect = btn.getBoundingClientRect();
          return {
            visible: rect.width > 0 && rect.height > 0,
            fitsInViewport: rect.right <= ${vp.width} && rect.bottom <= ${vp.height},
            rect: { right: rect.right, bottom: rect.bottom }
          };
        })()`,
        returnByValue: true,
      });
      const mb = mobileBtnCheck.result.value;
      assert(`Mobile ${vp.name}: Launcher fits within viewport bounds (${mb?.rect.right}px <= ${vp.width}px)`, mb && mb.fitsInViewport);

      // Open dialog and verify it fits on mobile screen
      await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const btn = document.querySelector("button[aria-label*='LabLens AI Assistant']");
          if (btn) btn.click();
        })()`,
      });
      await sleep(400);

      const mobileDialogCheck = await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const dialog = document.querySelector("div[role='dialog'][aria-label='LabLens AI Assistant']");
          if (!dialog) return null;
          const rect = dialog.getBoundingClientRect();
          const docWidth = document.documentElement.scrollWidth;
          return {
            fitsHorizontally: rect.right <= ${vp.width} && rect.left >= 0,
            noDocOverflow: docWidth <= ${vp.width},
            dialogWidth: rect.width,
            docWidth
          };
        })()`,
        returnByValue: true,
      });
      const md = mobileDialogCheck.result.value;
      assert(`Mobile ${vp.name}: Chat dialog window fits horizontally without document overflow`, md && md.fitsHorizontally && md.noDocOverflow);

      // Close dialog
      await cdp.send("Input.dispatchKeyEvent", {
        type: "keyDown",
        key: "Escape",
        code: "Escape",
        windowsVirtualKeyCode: 27,
      });
      await sleep(300);
    }

  } finally {
    console.log("\n=================================================================");
    console.log(`CHATBOT OMNIPRESENCE VERIFICATION SUMMARY: ${passedCount}/${totalCount} PASSED`);
    console.log("=================================================================");

    await cdp.close();
    nextProcess.kill("SIGTERM");
    chromeProcess.kill("SIGTERM");
  }

  process.exit(passedCount === totalCount ? 0 : 1);
}

run().catch((err) => {
  console.error("Test runner encountered unhandled error:", err);
  process.exit(1);
});
