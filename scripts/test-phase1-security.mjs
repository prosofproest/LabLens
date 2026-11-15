/**
 * LabLens AI — Phase 1: Production Security & Resilience Test Suite
 *
 * Verifies:
 * 1. Content Security Policy (CSP) & Security Headers in next.config.ts
 * 2. Next.js App Router error boundaries (error.tsx & global-error.tsx)
 * 3. Guest Chatbot Origin Protection & Cross-Site Abuse Prevention
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

let passedCount = 0;
let totalCount = 0;

function check(title, condition, detail = "") {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`[PASS] ${title}`);
  } else {
    console.error(`[FAIL] ${title}${detail ? " -> " + detail : ""}`);
  }
}

async function runPhase1SecurityTests() {
  console.log("=================================================================");
  console.log("   LabLens AI — Phase 1: Security & Resilience Test Suite        ");
  console.log("=================================================================\n");

  // =========================================================================
  // Section 1: CSP & Security Headers in next.config.ts
  // =========================================================================
  console.log("--- Section 1: Security Headers & Content Security Policy (CSP) ---");

  const nextConfigPath = path.join(projectRoot, "next.config.ts");
  check("1.1 next.config.ts exists", fs.existsSync(nextConfigPath));

  // Dynamically import nextConfig
  // Note: We use dynamic import via tsx
  const nextConfigModule = await import("../next.config.ts");
  const nextConfig = nextConfigModule.default || nextConfigModule;

  check("1.2 nextConfig defines headers() async function", typeof nextConfig.headers === "function");

  const configuredHeaders = await nextConfig.headers();
  check("1.3 headers() returns array with global '/:path*' route matcher", 
    Array.isArray(configuredHeaders) && configuredHeaders.some((h) => h.source === "/:path*")
  );

  const globalRule = configuredHeaders.find((h) => h.source === "/:path*");
  const headersMap = new Map();
  if (globalRule?.headers) {
    for (const item of globalRule.headers) {
      headersMap.set(item.key.toLowerCase(), item.value);
    }
  }

  // 1. Strict-Transport-Security (HSTS)
  const hsts = headersMap.get("strict-transport-security");
  check(
    "1.4 Strict-Transport-Security enforces max-age=63072000; includeSubDomains; preload",
    hsts?.includes("max-age=63072000") && hsts?.includes("includeSubDomains") && hsts?.includes("preload"),
    `Actual: ${hsts}`
  );

  // 2. X-Frame-Options
  const xFrame = headersMap.get("x-frame-options");
  check("1.5 X-Frame-Options is strictly DENY", xFrame === "DENY", `Actual: ${xFrame}`);

  // 3. X-Content-Type-Options
  const xContentType = headersMap.get("x-content-type-options");
  check("1.6 X-Content-Type-Options is nosniff", xContentType === "nosniff", `Actual: ${xContentType}`);

  // 4. Referrer-Policy
  const referrerPolicy = headersMap.get("referrer-policy");
  check(
    "1.7 Referrer-Policy is strict-origin-when-cross-origin",
    referrerPolicy === "strict-origin-when-cross-origin",
    `Actual: ${referrerPolicy}`
  );

  // 5. Permissions-Policy
  const permissionsPolicy = headersMap.get("permissions-policy");
  check(
    "1.8 Permissions-Policy disables camera, microphone, geolocation, browsing-topics",
    permissionsPolicy?.includes("camera=()") &&
      permissionsPolicy?.includes("microphone=()") &&
      permissionsPolicy?.includes("geolocation=()") &&
      permissionsPolicy?.includes("browsing-topics=()"),
    `Actual: ${permissionsPolicy}`
  );

  // 6. Content-Security-Policy Directives
  const csp = headersMap.get("content-security-policy") || "";
  check("1.9 Content-Security-Policy header is configured", csp.length > 0);
  check("1.10 CSP default-src is 'self'", csp.includes("default-src 'self'"), `CSP: ${csp}`);
  check("1.11 CSP script-src includes 'self' and 'unsafe-inline'", 
    csp.includes("script-src 'self' 'unsafe-inline'"), `CSP: ${csp}`
  );
  check("1.12 CSP production script-src strictly forbids 'unsafe-eval'", 
    !csp.includes("'unsafe-eval'"), `Found unsafe-eval in CSP: ${csp}`
  );
  check("1.13 CSP style-src includes 'self' and 'unsafe-inline'", 
    csp.includes("style-src 'self' 'unsafe-inline'"), `CSP: ${csp}`
  );
  check("1.14 CSP img-src permits 'self', blob:, data:, and https://res.cloudinary.com", 
    csp.includes("img-src 'self' blob: data: https://res.cloudinary.com"), `CSP: ${csp}`
  );
  check("1.15 CSP connect-src permits Firebase Auth and Firestore endpoints", 
    csp.includes("https://identitytoolkit.googleapis.com") &&
      csp.includes("https://firestore.googleapis.com") &&
      csp.includes("https://*.firebaseapp.com"),
    `CSP: ${csp}`
  );
  check("1.16 CSP connect-src permits local development and emulator connections", 
    csp.includes("http://127.0.0.1:*") &&
      csp.includes("ws://127.0.0.1:*") &&
      csp.includes("http://localhost:*") &&
      csp.includes("ws://localhost:*"),
    `CSP: ${csp}`
  );
  check(
    "1.17 CSP connect-src strictly excludes Groq Cloud endpoint (Groq is server-side only)",
    !csp.includes("groq.com") && !csp.includes("api.groq.com"),
    `Browser connect-src must not allow direct Groq calls: ${csp}`
  );
  check("1.18 CSP frame-ancestors is 'none' (clickjacking defense)", csp.includes("frame-ancestors 'none'"));
  check("1.19 CSP object-src is 'none' (blocks plugins/Flash)", csp.includes("object-src 'none'"));
  check("1.20 CSP base-uri is 'self' and form-action is 'self'", 
    csp.includes("base-uri 'self'") && csp.includes("form-action 'self'")
  );

  // =========================================================================
  // Section 2: Application Error Boundaries (error.tsx & global-error.tsx)
  // =========================================================================
  console.log("\n--- Section 2: Application Error Boundaries ---");

  const errorBoundaryPath = path.join(projectRoot, "src/app/error.tsx");
  const globalErrorPath = path.join(projectRoot, "src/app/global-error.tsx");

  check("2.1 src/app/error.tsx exists", fs.existsSync(errorBoundaryPath));
  check("2.2 src/app/global-error.tsx exists", fs.existsSync(globalErrorPath));

  const errorBoundarySource = fs.readFileSync(errorBoundaryPath, "utf-8");
  check("2.3 error.tsx is a client component ('use client')", errorBoundarySource.startsWith('"use client"'));
  check("2.4 error.tsx has semantic role='alert' and aria-live='assertive'", 
    errorBoundarySource.includes('role="alert"') && errorBoundarySource.includes('aria-live="assertive"')
  );
  check("2.5 error.tsx provides reset() retry action", errorBoundarySource.includes("reset()"));
  check("2.6 error.tsx includes dashboard navigation link", errorBoundarySource.includes('href="/dashboard"'));
  check("2.7 error.tsx safely surfaces error.digest without leaking stack trace to user", 
    errorBoundarySource.includes("error.digest") && !errorBoundarySource.includes("error.stack")
  );

  const globalErrorSource = fs.readFileSync(globalErrorPath, "utf-8");
  check("2.8 global-error.tsx is a client component ('use client')", globalErrorSource.startsWith('"use client"'));
  check("2.9 global-error.tsx defines root <html> and <body> tags", 
    globalErrorSource.includes("<html") && globalErrorSource.includes("<body")
  );
  check("2.10 global-error.tsx has semantic role='alert'", globalErrorSource.includes('role="alert"'));
  check("2.11 global-error.tsx provides reset() and window.location.reload() recovery options", 
    globalErrorSource.includes("reset()") && globalErrorSource.includes("window.location.reload()")
  );
  check("2.12 global-error.tsx safely surfaces error.digest without leaking raw error object", 
    globalErrorSource.includes("error.digest") && !globalErrorSource.includes("error.stack")
  );

  // =========================================================================
  // Section 3: Guest Chatbot Origin Protection (isTrustedGuestOrigin)
  // =========================================================================
  console.log("\n--- Section 3: Guest Chatbot Origin Protection ---");

  const { isTrustedGuestOrigin, POST: chatHandler } = await import("../src/app/api/chat/route.ts");
  const { NextRequest } = await import("next/server");

  check("3.1 isTrustedGuestOrigin helper function is exported", typeof isTrustedGuestOrigin === "function");

  // Helper to build NextRequest with custom headers
  function createMockRequest(url, headers = {}) {
    return new NextRequest(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
    });
  }

  // 3.2 Localhost origin is trusted
  const localReq = createMockRequest("http://localhost:3000/api/chat", {
    origin: "http://localhost:3000",
  });
  check("3.2 Origin 'http://localhost:3000' is trusted", isTrustedGuestOrigin(localReq) === true);

  // 3.3 127.0.0.1 loopback is trusted
  const loopbackReq = createMockRequest("http://127.0.0.1:3000/api/chat", {
    origin: "http://127.0.0.1:3000",
  });
  check("3.3 Origin 'http://127.0.0.1:3000' is trusted", isTrustedGuestOrigin(loopbackReq) === true);

  // 3.4 Referer fallback with localhost is trusted
  const refererReq = createMockRequest("http://localhost:3000/api/chat", {
    referer: "http://localhost:3000/dashboard",
  });
  check("3.4 Referer 'http://localhost:3000/dashboard' is trusted", isTrustedGuestOrigin(refererReq) === true);

  // 3.5 Configured trusted origin in APP_TRUSTED_ORIGINS is allowed
  process.env.APP_TRUSTED_ORIGINS = "https://lablens.ac.in,https://lablens-preview.vercel.app";
  const configuredOriginReq = createMockRequest("http://localhost:3000/api/chat", {
    origin: "https://lablens-preview.vercel.app",
  });
  check(
    "3.5 Configured origin in APP_TRUSTED_ORIGINS ('https://lablens-preview.vercel.app') is trusted",
    isTrustedGuestOrigin(configuredOriginReq) === true
  );

  // 3.5b Arbitrary unconfigured Vercel domain is strictly rejected (no blanket wildcard)
  const arbitraryVercelReq = createMockRequest("http://localhost:3000/api/chat", {
    origin: "https://arbitrary-attacker-site.vercel.app",
  });
  check(
    "3.5b Arbitrary unconfigured Vercel domain ('https://arbitrary-attacker-site.vercel.app') is strictly rejected",
    isTrustedGuestOrigin(arbitraryVercelReq) === false
  );

  // 3.6 Cross-site malicious origin is rejected
  const maliciousReq = createMockRequest("http://localhost:3000/api/chat", {
    origin: "https://evil-phishing-site.com",
    host: "localhost:3000",
  });
  check(
    "3.6 Cross-site malicious origin 'https://evil-phishing-site.com' is rejected (returns false)",
    isTrustedGuestOrigin(maliciousReq) === false
  );

  // 3.7 Cross-site malicious referer is rejected
  const maliciousRefererReq = createMockRequest("http://localhost:3000/api/chat", {
    referer: "https://malicious-attacker.org/embed-frame",
    host: "localhost:3000",
  });
  check(
    "3.7 Cross-site malicious referer 'https://malicious-attacker.org' is rejected (returns false)",
    isTrustedGuestOrigin(maliciousRefererReq) === false
  );

  // 3.8 Integration: Untrusted origin in unauthenticated chat request returns HTTP 403 Forbidden
  const chatUntrustedReq = new NextRequest("http://localhost:3000/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://unauthorized-external-site.com",
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Hello from unauthorized site" }],
    }),
  });

  const chatResponse = await chatHandler(chatUntrustedReq);
  const chatBody = await chatResponse.json();

  check(
    "3.8 /api/chat returns HTTP 403 when unauthenticated guest request has untrusted origin",
    chatResponse.status === 403,
    `Status was ${chatResponse.status}`
  );
  check(
    "3.9 403 response includes descriptive forbidden origin message",
    chatBody.error?.includes("Forbidden: Request origin is not permitted"),
    `Error: ${chatBody.error}`
  );

  // 3.10 Authenticated user requests bypass guest origin restriction
  // (Authenticated requests rely on cryptographic Firebase ID token verification)
  const chatAuthUntrustedOriginReq = new NextRequest("http://localhost:3000/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer invalid_test_token_sample",
      origin: "https://external-client-app.com",
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Authenticated client check" }],
    }),
  });

  const chatAuthResponse = await chatHandler(chatAuthUntrustedOriginReq);
  check(
    "3.10 Authenticated flow reaches token validation (returns 401 on invalid token, not 403 origin rejection)",
    chatAuthResponse.status === 401,
    `Status was ${chatAuthResponse.status}`
  );

  // =========================================================================
  // Summary
  // =========================================================================
  console.log("\n=================================================================");
  console.log(`PHASE 1 SECURITY TEST SUITE RESULT: ${passedCount}/${totalCount} PASSED`);
  console.log("=================================================================");

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runPhase1SecurityTests().catch((err) => {
  console.error("Test execution failed with unhandled error:", err);
  process.exit(1);
});
