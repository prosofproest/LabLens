// Orchestrates headless Chrome, Next.js dev server (with emulator enabled),
// and executes the complete browser CDP verification test suite.

import { spawn } from "child_process";

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
    await sleep(400);
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function run() {
  console.log("=== LAUNCHING ENVIRONMENT FOR BROWSER UI VERIFICATION ===");

  // 1. Launch Headless Chrome on port 9222
  console.log("Starting headless Chrome on port 9222...");
  const chromeProcess = spawn(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ["--headless=new", "--remote-debugging-port=9222", "--user-data-dir=/tmp/lablens-chrome-test-profile"],
    { stdio: "ignore" }
  );

  await waitForHttp("http://127.0.0.1:9222/json/version", 15000);
  console.log("[OK] Headless Chrome CDP ready at http://127.0.0.1:9222");

  // 2. Launch Next.js dev server with Firebase Emulator environment variables
  console.log("Starting Next.js dev server on port 3000 with Firebase Emulator flags...");
  const devEnv = {
    ...process.env,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-no-project",
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyMockKeyForBuildVerification",
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
  console.log("[OK] Next.js dev server ready at http://localhost:3000");

  let exitCode = 0;
  try {
    // 3. Execute CDP Test Suite
    console.log("\nStarting CDP Test Suite...\n");
    const testProcess = spawn("node", ["scripts/test-browser-cdp.mjs"], { stdio: "inherit" });

    exitCode = await new Promise((resolve) => {
      testProcess.on("close", (code) => resolve(code ?? 1));
    });
  } catch (err) {
    console.error("Test execution failed:", err);
    exitCode = 1;
  } finally {
    console.log("\nTearing down headless Chrome and Next.js dev server...");
    nextProcess.kill("SIGTERM");
    chromeProcess.kill("SIGTERM");
    await sleep(1500);
  }

  process.exit(exitCode);
}

run().catch((err) => {
  console.error("Runner encountered fatal error:", err);
  process.exit(1);
});
