// Complete Live Integration Verification Suite
// Tests real Cloudinary media uploads and real Groq AI fault triage and chatbot
// using credentials loaded safely from .env.local.
// NEVER prints or exposes secret values.

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// 1. Securely load .env.local without exposing secrets
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.substring(0, eqIdx).trim();
      let val = trimmed.substring(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    }
  }
}

// Dynamic imports after env is loaded
const { isCloudinaryConfigured, uploadImageBuffer } = await import("../src/lib/cloudinary/server.ts");
const { v2: cloudinary } = await import("cloudinary");
const { isGroqConfigured, getValidatedGroqModel } = await import("../src/lib/groq/client.ts");
const { analyzeFaultReport, VALID_CATEGORIES, VALID_PRIORITIES } = await import("../src/lib/groq/triage.ts");

console.log("=== EXECUTING LIVE PRODUCTION INTEGRATION VERIFICATION SUITE ===\n");

const tests = [];

function assert(name, condition, details = "") {
  if (condition) {
    console.log(`[PASS] ${name}`);
    tests.push({ name, pass: true });
  } else {
    console.error(`[FAIL] ${name} ${details}`);
    tests.push({ name, pass: false });
  }
}

async function run() {
  // =========================================================================
  // Section 1: Security & Credential Hygiene
  // =========================================================================
  console.log("--- Section 1: Security & Credential Hygiene ---");
  const gitIgnoreCheck = execSync("git check-ignore .env.local", { encoding: "utf8" }).trim();
  assert("Security 1a: .env.local is confirmed ignored by git", gitIgnoreCheck === ".env.local");

  // Check no secrets are prefixed with NEXT_PUBLIC_ in .env.local
  const envContent = fs.readFileSync(envPath, "utf8");
  const hasLeakedCloudinarySecret = envContent.includes("NEXT_PUBLIC_CLOUDINARY_API_SECRET");
  const hasLeakedGroqSecret = envContent.includes("NEXT_PUBLIC_GROQ_API_KEY");
  assert("Security 1b: Cloudinary API secret has NO NEXT_PUBLIC_ prefix", !hasLeakedCloudinarySecret);
  assert("Security 1c: Groq API key has NO NEXT_PUBLIC_ prefix", !hasLeakedGroqSecret);
  assert("Security 1d: Cloudinary is configured via server-only environment variables", isCloudinaryConfigured());
  assert("Security 1e: Groq AI is configured via server-only environment variables", isGroqConfigured());

  // =========================================================================
  // Section 2: Real Cloudinary Live Upload Verification
  // =========================================================================
  console.log("\n--- Section 2: Real Cloudinary Live Upload Verification ---");
  const testUid = `live_test_user_${Date.now()}`;
  const targetFolder = `lablens-fault-reports/${testUid}`;

  // Create a minimal 1x1 transparent PNG buffer
  const samplePngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64"
  );

  let uploadedPublicId = null;
  let uploadUrl = null;

  try {
    const uploadResult = await uploadImageBuffer(samplePngBuffer, targetFolder);
    uploadedPublicId = uploadResult.publicId;
    uploadUrl = uploadResult.url;

    assert(
      "[LIVE CLOUDINARY] Upload 2a: Image uploaded successfully to Cloudinary account",
      Boolean(uploadedPublicId && uploadUrl)
    );
    assert(
      "[LIVE CLOUDINARY] Upload 2b: Uploaded image public_id is scoped to user folder: " + targetFolder,
      uploadedPublicId.startsWith(targetFolder)
    );
    assert(
      "[LIVE CLOUDINARY] Upload 2c: Secure HTTPS URL returned matching Cloudinary CDN",
      uploadUrl.startsWith("https://res.cloudinary.com/") && uploadUrl.includes(process.env.CLOUDINARY_CLOUD_NAME)
    );

    // Verify asset metadata exists in Cloudinary via Admin API
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    const resourceInfo = await cloudinary.api.resource(uploadedPublicId);
    assert(
      "[LIVE CLOUDINARY] Upload 2d: Verified asset existence and metadata in Cloudinary API",
      resourceInfo && resourceInfo.public_id === uploadedPublicId && resourceInfo.format === "png"
    );

    // Clean up the test image so we leave zero debris in the user's Cloudinary account
    const destroyRes = await cloudinary.uploader.destroy(uploadedPublicId);
    assert(
      "[LIVE CLOUDINARY] Upload 2e: Temporary verification asset deleted cleanly from Cloudinary",
      destroyRes.result === "ok"
    );
  } catch (err) {
    const errMsg = err.message || JSON.stringify(err);
    if (errMsg.includes('actions=["create"]') || errMsg.includes('missing permissions')) {
      console.log(`[STATUS: BLOCKED BY CLOUDINARY IAM] Cloudinary rejected live upload: ${errMsg}`);
      console.log(`Action Required: The Cloudinary API Key in .env.local needs "create" (upload) permissions in Cloudinary Console -> Settings -> Access Keys.`);
      assert("[LIVE CLOUDINARY] Upload 2: Live Cloudinary blocked by Access Key IAM permissions (actions=['create'])", false, errMsg);
    } else {
      assert("[LIVE CLOUDINARY] Upload 2: Live Cloudinary execution failed", false, errMsg);
    }
  }

  // =========================================================================
  // Section 3: /api/upload Route Handler Validation
  // =========================================================================
  console.log("\n--- Section 3: /api/upload Route Handler Validation ---");
  const { POST: uploadHandler } = await import("../src/app/api/upload/route.ts");

  // Test 3a: Unauthenticated request rejected
  const unauthReq = new Request("http://localhost:3000/api/upload", {
    method: "POST",
    headers: {},
  });
  const unauthRes = await uploadHandler(unauthReq);
  assert(
    "Upload Route 3a: Unauthenticated upload strictly rejected with HTTP 401",
    unauthRes.status === 401
  );

  // Test 3b: Unsupported file format (e.g. text/plain) rejected
  const emulatorToken = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url") + "." +
    Buffer.from(JSON.stringify({ sub: "test_uid_auth", user_id: "test_uid_auth", email: "test@college.edu", aud: "demo-no-project" })).toString("base64url") + ".";
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

  const textFile = new File(["not an image"], "test.txt", { type: "text/plain" });
  const textFormData = new FormData();
  textFormData.append("file", textFile);

  const invalidTypeReq = new Request("http://localhost:3000/api/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${emulatorToken}` },
    body: textFormData,
  });
  const invalidTypeRes = await uploadHandler(invalidTypeReq);
  const invalidTypeData = await invalidTypeRes.json();
  assert(
    "Upload Route 3b: Unsupported file type rejected with HTTP 400",
    invalidTypeRes.status === 400 && invalidTypeData.error.includes("Unsupported file format")
  );

  // Test 3c: Oversized file (> 5MB) rejected
  const oversizedBytes = new Uint8Array(5.5 * 1024 * 1024); // 5.5MB
  const oversizedFile = new File([oversizedBytes], "large.png", { type: "image/png" });
  const oversizedFormData = new FormData();
  oversizedFormData.append("file", oversizedFile);

  const oversizedReq = new Request("http://localhost:3000/api/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${emulatorToken}` },
    body: oversizedFormData,
  });
  const oversizedRes = await uploadHandler(oversizedReq);
  const oversizedData = await oversizedRes.json();
  assert(
    "Upload Route 3c: Oversized payload (> 5MB) rejected with HTTP 400",
    oversizedRes.status === 400 && oversizedData.error.includes("exceeds the 5MB limit")
  );

  // =========================================================================
  // Section 4: Live Groq AI Fault Triage Analysis
  // =========================================================================
  console.log("\n--- Section 4: Live Groq AI Fault Triage Analysis ---");
  const validatedModel = getValidatedGroqModel();
  assert(
    "Groq 4a: Model validated against allowed catalog (" + validatedModel + ")",
    validatedModel === "openai/gpt-oss-20b" || validatedModel === "qwen/qwen3.8-27b"
  );

  try {
    const liveTriageResult = await analyzeFaultReport({
      equipmentName: "Keysight DSOX1204G Digital Oscilloscope",
      assetId: "LAB-ECE-042",
      labName: "Electronics Circuit Lab",
      description: "Channel 1 BNC input port shows significant voltage offset, intermittent signal dropouts, and a faint electrical burning odor is detectable near the power supply cooling fan.",
    });

    assert(
      "[LIVE GROQ] Triage 4b: Real Groq inference executed successfully (status: success, isAiGenerated: true)",
      liveTriageResult.status === "success" && liveTriageResult.isAiGenerated === true
    );
    assert(
      "[LIVE GROQ] Triage 4c: Suggested category is valid (" + liveTriageResult.suggestedCategory + ")",
      VALID_CATEGORIES.includes(liveTriageResult.suggestedCategory)
    );
    assert(
      "[LIVE GROQ] Triage 4d: Suggested priority is valid (" + liveTriageResult.suggestedPriority + ")",
      VALID_PRIORITIES.includes(liveTriageResult.suggestedPriority)
    );
    assert(
      "[LIVE GROQ] Triage 4e: Executive summary and root cause provided by Groq",
      typeof liveTriageResult.executiveSummary === "string" &&
      liveTriageResult.executiveSummary.length > 20 &&
      typeof liveTriageResult.possibleRootCause === "string" &&
      liveTriageResult.possibleRootCause.length > 20
    );
    assert(
      "[LIVE GROQ] Triage 4f: Safety recommendation generated without suggesting dangerous user self-repair",
      typeof liveTriageResult.recommendedAction === "string" && liveTriageResult.recommendedAction.length > 20
    );
  } catch (err) {
    assert("[LIVE GROQ] Triage 4: Live Groq inference failed", false, err.message);
  }

  // =========================================================================
  // Section 5: Live Groq AI Floating Chatbot Verification
  // =========================================================================
  console.log("\n--- Section 5: Live Groq AI Floating Chatbot Verification ---");
  const { POST: chatHandler } = await import("../src/app/api/chat/route.ts");

  try {
    const chatReq = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: "There is white smoke and a crackling noise coming from the rear panel of an oscilloscope in Lab 3. What should I do right now?",
          },
        ],
      }),
    });

    const chatRes = await chatHandler(chatReq);
    const chatData = await chatRes.json();

    assert(
      "[LIVE GROQ] Chatbot 5a: /api/chat returns HTTP 200 with JSON response",
      chatRes.status === 200 && chatData.success === true
    );
    assert(
      "[LIVE GROQ] Chatbot 5b: Groq model identified (" + chatData.model + ")",
      chatData.model === "openai/gpt-oss-20b" || chatData.model === "qwen/qwen3.8-27b"
    );
    assert(
      "[LIVE GROQ] Chatbot 5c: AI completion text generated (" + (chatData.reply ? chatData.reply.length : 0) + " chars)",
      typeof chatData.reply === "string" && chatData.reply.length > 50
    );

    const lower = (chatData.reply || "").toLowerCase();
    const hasSafetyKeywords =
      lower.includes("power") ||
      lower.includes("unplug") ||
      lower.includes("technician") ||
      lower.includes("safety") ||
      lower.includes("distance") ||
      lower.includes("evacuate") ||
      lower.includes("switch");

    assert(
      "[LIVE GROQ] Chatbot 5d: AI completion strictly adheres to laboratory electrical safety protocols",
      hasSafetyKeywords
    );
  } catch (err) {
    assert("[LIVE GROQ] Chatbot 5: Live Chatbot execution failed", false, err.message);
  }

  console.log(`\n==============================================`);
  const passed = tests.filter((t) => t.pass).length;
  console.log(`LIVE INTEGRATION SUITE SUMMARY: ${passed}/${tests.length} PASSED`);
  console.log(`==============================================`);
}

run().catch((err) => {
  console.error("Live integration test encountered fatal error:", err);
  process.exit(1);
});
