// Security verification test suite for Server-side Firebase ID Token authentication in /api/upload
import { verifyFirebaseIdToken } from "../src/lib/firebase/serverAuth.ts";

console.log("=== RUNNING API UPLOAD SECURITY VERIFICATION SUITE ===\n");

const tests = [];

async function assertRejects(name, fn, expectedSubstring) {
  try {
    await fn();
    console.error(`[FAIL] ${name} (Expected error, but function resolved successfully)`);
    tests.push({ name, pass: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!expectedSubstring || msg.toLowerCase().includes(expectedSubstring.toLowerCase())) {
      console.log(`[PASS] ${name} (Correctly rejected: "${msg}")`);
      tests.push({ name, pass: true });
    } else {
      console.error(`[FAIL] ${name} (Error did not match "${expectedSubstring}": "${msg}")`);
      tests.push({ name, pass: false });
    }
  }
}

async function run() {
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "lablens-ai-test";

  // 1. Rejects missing token
  await assertRejects(
    "Security 1: Rejects empty or missing token",
    () => verifyFirebaseIdToken(""),
    "Missing or empty"
  );

  // 2. Rejects garbage non-JWT string
  await assertRejects(
    "Security 2: Rejects malformed non-JWT token string",
    () => verifyFirebaseIdToken("invalid.token.string"),
    "invalid"
  );

  // 3. Rejects token with forged signature
  const fakeHeader = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "fake_kid" })).toString("base64url");
  const fakePayload = Buffer.from(JSON.stringify({
    sub: "hacker_uid",
    iss: "https://securetoken.google.com/lablens-ai-test",
    aud: "lablens-ai-test",
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString("base64url");
  const forgedToken = `${fakeHeader}.${fakePayload}.fake_signature_bytes`;

  await assertRejects(
    "Security 3: Rejects forged/unverified RS256 signature",
    () => verifyFirebaseIdToken(forgedToken)
  );

  // 4. Test Emulator verification mode
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

  const validEmulatorToken = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url") +
    "." +
    Buffer.from(JSON.stringify({
      sub: "verified_user_123",
      email: "student@college.edu",
      email_verified: true,
    })).toString("base64url") +
    ".";

  const verified = await verifyFirebaseIdToken(validEmulatorToken);
  if (verified.uid === "verified_user_123" && verified.email === "student@college.edu") {
    console.log("[PASS] Security 4: Correctly extracts verified UID in emulator mode");
    tests.push({ name: "Security 4", pass: true });
  } else {
    console.error("[FAIL] Security 4: Did not extract correct claims:", verified);
    tests.push({ name: "Security 4", pass: false });
  }

  // 5. Emulator mode rejects token missing UID/sub
  const noSubToken = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url") +
    "." +
    Buffer.from(JSON.stringify({
      email: "nosub@college.edu",
    })).toString("base64url") +
    ".";

  await assertRejects(
    "Security 5: Emulator mode rejects token missing subject UID",
    () => verifyFirebaseIdToken(noSubToken)
  );

  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

  const passed = tests.filter(t => t.pass).length;
  console.log(`\n==============================================`);
  console.log(`UPLOAD AUTH SECURITY SUMMARY: ${passed}/${tests.length} PASSED`);
  console.log(`==============================================`);

  if (passed !== tests.length) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error("Test runner error:", err);
  process.exit(1);
});
