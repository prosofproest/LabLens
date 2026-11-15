// Unit test suite for Groq AI client configuration, model validation, stream limits, and safety fallback
import {
  getValidatedGroqModel,
  DEFAULT_GROQ_MODEL,
} from "../src/lib/groq/client.ts";
import { createUnavailableAiAnalysis } from "../src/lib/groq/triage.ts";
import { checkRateLimit } from "../src/lib/groq/rateLimit.ts";
import { readJsonWithByteLimit, PayloadTooLargeError } from "../src/lib/groq/streamLimit.ts";

console.log("=== GROQ AI INTEGRATION & SAFETY VERIFICATION SUITE ===\n");

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
  // Test 1: Default Groq Model
  delete process.env.GROQ_MODEL;
  const defaultModel = getValidatedGroqModel();
  assert(
    "Test 1: Defaults to openai/gpt-oss-20b when GROQ_MODEL is unset",
    defaultModel === "openai/gpt-oss-20b" && defaultModel === DEFAULT_GROQ_MODEL
  );

  // Test 2: Validates explicitly allowed model
  process.env.GROQ_MODEL = "qwen/qwen3.8-27b";
  const customModel = getValidatedGroqModel();
  assert(
    "Test 2: Accepts supported model qwen/qwen3.8-27b from allowlist",
    customModel === "qwen/qwen3.8-27b"
  );

  // Test 3: Rejects deprecated and unsupported models
  let rejectedDeprecated = false;
  try {
    process.env.GROQ_MODEL = "llama-3.1-8b-instant";
    getValidatedGroqModel();
  } catch (err) {
    rejectedDeprecated = err.message.includes("Unsupported GROQ_MODEL");
  }
  assert(
    "Test 3a: Strictly rejects deprecated model llama-3.1-8b-instant without switching",
    rejectedDeprecated
  );

  let rejectedThirdParty = false;
  try {
    process.env.GROQ_MODEL = "gpt-4o";
    getValidatedGroqModel();
  } catch (err) {
    rejectedThirdParty = err.message.includes("Unsupported GROQ_MODEL");
  }
  assert(
    "Test 3b: Strictly rejects non-Groq model gpt-4o",
    rejectedThirdParty
  );

  delete process.env.GROQ_MODEL;

  // Test 4: Fallback Triage Generator
  const fallback = createUnavailableAiAnalysis("Service offline test");
  assert(
    "Test 4a: Fallback is marked with status 'unavailable' and isAiGenerated false",
    fallback.status === "unavailable" && fallback.isAiGenerated === false
  );
  assert(
    "Test 4b: Fallback contains no confidenceScore or confidenceLabel property",
    !("confidenceScore" in fallback) && !("confidenceLabel" in fallback)
  );
  assert(
    "Test 4c: Fallback prioritizes safety with recommended non-invasive action",
    typeof fallback.recommendedAction === "string" && fallback.recommendedAction.includes("clearance")
  );

  // Test 5: Stream Limiter rejects payload exceeding 32 KB
  const largeObj = { data: "x".repeat(33 * 1024) }; // ~33 KB
  const largeStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(JSON.stringify(largeObj)));
      controller.close();
    },
  });

  const fakeLargeReq = new Request("http://localhost/api/chat", {
    method: "POST",
    body: largeStream,
    headers: { "Content-Type": "application/json" },
    duplex: "half",
  });

  let sizeRejected = false;
  try {
    await readJsonWithByteLimit(fakeLargeReq, 32 * 1024);
  } catch (err) {
    sizeRejected = err instanceof PayloadTooLargeError;
  }
  assert(
    "Test 5: Stream byte limiter rejects payloads > 32 KB during stream reading",
    sizeRejected
  );

  // Test 6: Stream Limiter accepts payload <= 32 KB
  const normalObj = { equipmentName: "Oscilloscope", description: "Fails self-test" };
  const normalStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(JSON.stringify(normalObj)));
      controller.close();
    },
  });

  const fakeNormalReq = new Request("http://localhost/api/chat", {
    method: "POST",
    body: normalStream,
    headers: { "Content-Type": "application/json" },
    duplex: "half",
  });

  const parsed = await readJsonWithByteLimit(fakeNormalReq, 32 * 1024);
  assert(
    "Test 6: Stream byte limiter accepts and parses valid payloads <= 32 KB",
    parsed.equipmentName === "Oscilloscope"
  );

  // Test 7: Rate limiter blocks after threshold
  const rateKey = "test_rate_user_unique";
  for (let i = 0; i < 15; i++) {
    checkRateLimit(rateKey, 15, 60000);
  }
  const blocked = checkRateLimit(rateKey, 15, 60000);
  assert(
    "Test 7: In-memory sliding rate limiter blocks 16th request in sliding window",
    blocked.allowed === false && blocked.remaining === 0
  );

  const passed = tests.filter((t) => t.pass).length;
  console.log(`\n==============================================`);
  console.log(`GROQ TRIAGE & SAFETY SUMMARY: ${passed}/${tests.length} PASSED`);
  console.log(`==============================================`);

  if (passed !== tests.length) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
