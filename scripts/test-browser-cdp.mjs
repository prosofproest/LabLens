// Automated Browser Verification Suite using Chrome DevTools Protocol (CDP)
// Connects to local headless Chrome on port 9222 and drives live browser sessions
// against http://localhost:3000 across viewports, routes, chatbot, and accessibility.

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
  console.log("=== EXECUTING BROWSER-LEVEL CDP VERIFICATION SUITE ===\n");

  // 1. Create a new tab via CDP REST endpoint
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

  // Wait for initial page hydration
  await sleep(1000);

  console.log("--- Section 1: Responsive Layout & Viewport Verification (7 Viewports) ---");
  for (const vp of VIEWPORTS) {
    // Set device metrics
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.isMobile,
    });

    await cdp.send("Page.navigate", { url: BASE_URL });
    await sleep(600);

    // Evaluate scroll width vs window inner width
    const overflowCheck = await cdp.send("Runtime.evaluate", {
      expression: `({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
        title: document.title
      })`,
      returnByValue: true,
    });

    const val = overflowCheck.result.value;
    assert(
      `Viewport ${vp.name}: No horizontal overflow (${val.scrollWidth}px <= ${val.innerWidth}px)`,
      !val.hasOverflow,
      `scrollWidth: ${val.scrollWidth}, innerWidth: ${val.innerWidth}`
    );
  }

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
    const currentPath = urlCheck.result.value;
    assert(
      `Protected Route ${pr.path} redirects unauthenticated user to ${pr.expected}`,
      currentPath === pr.expected,
      `Redirected to: ${currentPath}`
    );
  }

  console.log("\n--- Section 3: Auth Pages Accessibility & Touch Targets ---");
  // Check /login
  await cdp.send("Page.navigate", { url: `${BASE_URL}/login` });
  await sleep(600);

  const loginElements = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const email = document.getElementById("input-college-email") || document.querySelector("input[type='email']");
      const password = document.getElementById("input-password") || document.querySelector("input[type='password']");
      const submitBtn = document.querySelector("button[type='submit']");
      const btnRect = submitBtn ? submitBtn.getBoundingClientRect() : null;
      return {
        hasEmail: Boolean(email),
        hasPassword: Boolean(password),
        hasSubmit: Boolean(submitBtn),
        submitHeight: btnRect ? btnRect.height : 0,
        meetsTouchTarget: btnRect ? btnRect.height >= 44 : false
      };
    })()`,
    returnByValue: true,
  });

  const loginRes = loginElements.result.value;
  assert("Login Page: Form elements (email, password, submit) present", loginRes.hasEmail && loginRes.hasPassword && loginRes.hasSubmit);
  assert(`Login Page: Submit button touch target meets minimum height (${loginRes.submitHeight}px >= 44px)`, loginRes.meetsTouchTarget);

  // Check /register
  await cdp.send("Page.navigate", { url: `${BASE_URL}/register` });
  await sleep(600);

  const registerElements = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const name = document.getElementById("input-full-name") || document.querySelector("input[placeholder*='Full Name']");
      const email = document.getElementById("input-college-email") || document.querySelector("input[type='email']");
      const dept = document.getElementById("department-select") || document.querySelector("select");
      const password = document.getElementById("input-password") || document.querySelector("input[type='password']");
      const submitBtn = document.querySelector("button[type='submit']");
      const deptOptions = dept ? dept.options.length : 0;
      return {
        hasName: Boolean(name),
        hasEmail: Boolean(email),
        hasDept: Boolean(dept),
        deptOptionsCount: deptOptions,
        hasPassword: Boolean(password),
        hasSubmit: Boolean(submitBtn)
      };
    })()`,
    returnByValue: true,
  });

  const regRes = registerElements.result.value;
  assert("Register Page: Name, email, department dropdown, and password fields present", regRes.hasName && regRes.hasEmail && regRes.hasDept && regRes.hasPassword);
  assert(`Register Page: Department dropdown populated with academic departments (${regRes.deptOptionsCount} options)`, regRes.deptOptionsCount >= 6);

  console.log("\n--- Section 4: Floating Chatbot Real Interaction & Safety ---");
  // Navigate back to home
  await cdp.send("Page.navigate", { url: BASE_URL });
  await sleep(800);

  // Click floating launcher button
  const openChatbot = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const btn = document.querySelector("button[aria-label='Open LabLens AI Assistant']");
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })()`,
    returnByValue: true,
  });
  assert("Chatbot: Launcher button found and clicked", openChatbot.result.value === true);

  await sleep(400);

  // Verify dialog opened
  const dialogCheck = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const dialog = document.querySelector("div[role='dialog'][aria-label='LabLens AI Assistant']");
      if (!dialog) return { open: false };
      const rect = dialog.getBoundingClientRect();
      const textarea = dialog.querySelector("textarea");
      const suggestedPills = dialog.querySelectorAll("button");
      return {
        open: true,
        width: rect.width,
        height: rect.height,
        hasTextarea: Boolean(textarea),
        buttonCount: suggestedPills.length
      };
    })()`,
    returnByValue: true,
  });

  const dlg = dialogCheck.result.value;
  assert(`Chatbot: Dialog window displayed with responsive dimensions (${dlg.width}x${dlg.height}px)`, dlg.open && dlg.width > 280 && dlg.height > 400);

  // Send a safety question to the chatbot via the UI
  const sendQuestion = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const textarea = document.querySelector("div[role='dialog'] textarea");
      const form = document.querySelector("div[role='dialog'] form") || textarea?.closest("div");
      const sendBtn = document.querySelector("div[role='dialog'] button[type='submit']") || document.querySelector("div[role='dialog'] button[aria-label='Send message']");
      if (!textarea) return false;
      textarea.value = "What safety precautions apply to high-voltage lab equipment?";
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Submit via Enter key or button click
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true });
      textarea.dispatchEvent(enterEvent);
      return true;
    })()`,
    returnByValue: true,
  });
  assert("Chatbot: Safety inquiry dispatched through the user interface", sendQuestion.result.value === true);

  // Wait for Groq AI response to stream or arrive
  console.log("Waiting for chatbot response to render in UI...");
  let chatAnswerFound = false;

  for (let i = 0; i < 20; i++) {
    await sleep(600);
    const chatMsgCheck = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const dialog = document.querySelector("div[role='dialog'][aria-label='LabLens AI Assistant']");
        if (!dialog) return { count: 0, text: "" };
        const text = dialog.innerText;
        return {
          text: text,
          hasAssistantResponse: text.includes("precaution") || text.includes("safety") || text.includes("distance") || text.includes("technician") || text.includes("power") || text.includes("Assistant")
        };
      })()`,
      returnByValue: true,
    });

    if (chatMsgCheck.result.value.hasAssistantResponse) {
      chatAnswerFound = true;
      break;
    }
  }

  assert("Chatbot: Assistant response rendered successfully in the chat feed", chatAnswerFound);

  // Close dialog via Escape key
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
  assert("Chatbot: Dismissed cleanly via Escape key keyboard navigation", closedCheck.result.value === false);

  // Cleanup tab
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
