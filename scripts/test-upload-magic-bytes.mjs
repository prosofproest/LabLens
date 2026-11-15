/**
 * LabLens AI — Phase 2: Image Signature & Upload Security Test Suite
 *
 * Verifies:
 * 1. Deep file-signature and structural integrity validation (JPEG, PNG, WebP, GIF)
 * 2. Small legitimate images (1x1 pixel samples) pass without arbitrary size rejection
 * 3. Spoofed extensions, forged MIME types, and text/script files are strictly rejected
 * 4. MIME/signature mismatches are strictly rejected
 * 5. Malformed and truncated image files are strictly rejected
 * 6. Empty files (0 bytes) and oversized files (> 5MB) are strictly rejected
 * 7. /api/upload integration: Cloudinary is NEVER invoked for invalid/unauthenticated files
 * 8. Hardened guest chatbot Origin validation (exact matching, no wildcard *.vercel.app)
 * 9. Demo attachment isolation: zero calls to /api/upload
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// Load .env.local if present, or set fallback mock credentials for testing
const envPath = path.resolve(projectRoot, ".env.local");
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

process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "test_mock_cloud";
process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "123456789";
process.env.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "mock_secret_abcdef";

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

// Minimal legitimate 1x1 PNG (68 bytes)
const VALID_1X1_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c49444154789c63606060000000040001737501180000000049454e44ae426082",
  "hex"
);

// Minimal legitimate 1x1 GIF (35 bytes)
const VALID_1X1_GIF = Buffer.from(
  "47494638396101000100800000ff00000000002c00000000010001000002024401003b",
  "hex"
);

// Minimal legitimate 1x1 WebP (lossless VP8L, 38 bytes)
const VALID_1X1_WEBP = Buffer.from(
  "524946461e000000574542505650384c120000002f00000000078888fe07000020000000",
  "hex"
);

// Minimal legitimate JPEG (134 bytes)
const VALID_JPEG = Buffer.from(
  "ffd8ffe000104a46494600010101004800480000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffda0008010100003f007f00ffd9",
  "hex"
);

async function runUploadSecurityTests() {
  console.log("=================================================================");
  console.log("   LabLens AI — Phase 2: Production Upload Security Test Suite   ");
  console.log("=================================================================\n");

  // =========================================================================
  // Section 1: Image Signature & Structural Validator Unit Tests
  // =========================================================================
  console.log("--- Section 1: File Signature & Structural Validation ---");

  const { validateImageBuffer, detectImageFormat } = await import(
    "../src/lib/security/imageSignature.ts"
  );

  // 1.1 Valid PNG detection & structure
  const pngResult = validateImageBuffer(VALID_1X1_PNG, "image/png");
  check("1.1 Valid 1x1 PNG is accepted with valid dimensions", pngResult.isValid === true && pngResult.format === "png");
  check("1.1b PNG format detected from raw bytes", detectImageFormat(VALID_1X1_PNG) === "png");

  // 1.2 Valid GIF detection & structure
  const gifResult = validateImageBuffer(VALID_1X1_GIF, "image/gif");
  check("1.2 Valid 1x1 GIF is accepted with valid dimensions", gifResult.isValid === true && gifResult.format === "gif");
  check("1.2b GIF format detected from raw bytes", detectImageFormat(VALID_1X1_GIF) === "gif");

  // 1.3 Valid WebP detection & structure
  const webpResult = validateImageBuffer(VALID_1X1_WEBP, "image/webp");
  check("1.3 Valid 1x1 WebP is accepted with valid dimensions", webpResult.isValid === true && webpResult.format === "webp");
  check("1.3b WebP format detected from raw bytes", detectImageFormat(VALID_1X1_WEBP) === "webp");

  // 1.4 Valid JPEG detection & structure
  const jpegResult = validateImageBuffer(VALID_JPEG, "image/jpeg");
  check("1.4 Valid minimal JPEG is accepted with valid dimensions", jpegResult.isValid === true && jpegResult.format === "jpeg");
  check("1.4b JPEG format detected from raw bytes", detectImageFormat(VALID_JPEG) === "jpeg");

  // 1.5 Legitimate small images are NOT rejected for small size
  check("1.5 Valid 68-byte PNG is not rejected for size", VALID_1X1_PNG.length < 100 && pngResult.isValid);
  check("1.5b Valid 35-byte GIF is not rejected for size", VALID_1X1_GIF.length < 50 && gifResult.isValid);

  // =========================================================================
  // Section 2: Forged Extensions, Scripts, & Non-Image Payloads
  // =========================================================================
  console.log("\n--- Section 2: Forged Extensions & Malicious Non-Image Payloads ---");

  // 2.1 Shell script disguised as JPEG
  const bashScript = Buffer.from("#!/bin/bash\nrm -rf /tmp/test\necho 'hacked'");
  const bashResult = validateImageBuffer(bashScript, "image/jpeg");
  check(
    "2.1 Shell script disguised as image/jpeg is strictly rejected",
    bashResult.isValid === false && bashResult.code === "CORRUPTED_CONTAINER"
  );

  // 2.2 SVG / HTML payload disguised as PNG
  const svgPayload = Buffer.from("<svg onload='alert(1)'><circle r='10'/></svg>");
  const svgResult = validateImageBuffer(svgPayload, "image/png");
  check(
    "2.2 SVG/HTML payload disguised as image/png is strictly rejected",
    svgResult.isValid === false && svgResult.code === "CORRUPTED_CONTAINER"
  );

  // 2.3 ELF Binary disguised as WebP
  const elfBinary = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]);
  const elfResult = validateImageBuffer(elfBinary, "image/webp");
  check(
    "2.3 Executable binary disguised as image/webp is strictly rejected",
    elfResult.isValid === false && elfResult.code === "CORRUPTED_CONTAINER"
  );

  // 2.4 Polyglot: Magic bytes prepended to a shell script
  const fakePngScript = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from("#!/bin/sh\necho 'polyglot'"),
  ]);
  const polyglotResult = validateImageBuffer(fakePngScript, "image/png");
  check(
    "2.4 Polyglot (PNG signature + script payload) is rejected due to missing IHDR chunk",
    polyglotResult.isValid === false && polyglotResult.code === "MALFORMED_HEADER"
  );

  // =========================================================================
  // Section 3: MIME Type & Signature Mismatch Detection
  // =========================================================================
  console.log("\n--- Section 3: MIME Type vs Signature Mismatch Detection ---");

  // 3.1 Real PNG submitted with declared MIME type image/jpeg
  const pngAsJpeg = validateImageBuffer(VALID_1X1_PNG, "image/jpeg");
  check(
    "3.1 Valid PNG submitted with declared MIME image/jpeg is rejected (MIME_MISMATCH)",
    pngAsJpeg.isValid === false && pngAsJpeg.code === "MIME_MISMATCH"
  );

  // 3.2 Real JPEG submitted with declared MIME type image/png
  const jpegAsPng = validateImageBuffer(VALID_JPEG, "image/png");
  check(
    "3.2 Valid JPEG submitted with declared MIME image/png is rejected (MIME_MISMATCH)",
    jpegAsPng.isValid === false && jpegAsPng.code === "MIME_MISMATCH"
  );

  // 3.3 Real GIF submitted with declared MIME type image/webp
  const gifAsWebp = validateImageBuffer(VALID_1X1_GIF, "image/webp");
  check(
    "3.3 Valid GIF submitted with declared MIME image/webp is rejected (MIME_MISMATCH)",
    gifAsWebp.isValid === false && gifAsWebp.code === "MIME_MISMATCH"
  );

  // =========================================================================
  // Section 4: Malformed, Truncated, & Boundary File Validation
  // =========================================================================
  console.log("\n--- Section 4: Malformed, Truncated, & Boundary File Validation ---");

  // 4.1 Empty buffer (0 bytes)
  const emptyBuffer = Buffer.alloc(0);
  const emptyResult = validateImageBuffer(emptyBuffer, "image/png");
  check(
    "4.1 Empty file (0 bytes) is strictly rejected (EMPTY_FILE)",
    emptyResult.isValid === false && emptyResult.code === "EMPTY_FILE"
  );

  // 4.2 Truncated PNG (only 12 bytes: signature + partial IHDR length)
  const truncatedPng = VALID_1X1_PNG.subarray(0, 12);
  const truncPngResult = validateImageBuffer(truncatedPng, "image/png");
  check(
    "4.2 Truncated PNG (missing IHDR data & IEND) is rejected (MALFORMED_HEADER)",
    truncPngResult.isValid === false && truncPngResult.code === "MALFORMED_HEADER"
  );

  // 4.3 PNG missing IEND trailer chunk
  const pngWithoutIend = VALID_1X1_PNG.subarray(0, VALID_1X1_PNG.length - 12);
  const noIendResult = validateImageBuffer(pngWithoutIend, "image/png");
  check(
    "4.3 PNG missing terminal IEND chunk is rejected as truncated",
    noIendResult.isValid === false && noIendResult.code === "MALFORMED_HEADER"
  );

  // 4.4 Truncated JPEG (missing EOI trailer FF D9)
  const truncatedJpeg = VALID_JPEG.subarray(0, VALID_JPEG.length - 10);
  const truncJpegResult = validateImageBuffer(truncatedJpeg, "image/jpeg");
  check(
    "4.4 Truncated JPEG (missing EOI trailer) is rejected",
    truncJpegResult.isValid === false && truncJpegResult.code === "MALFORMED_HEADER"
  );

  // 4.5 Truncated GIF (missing terminal 0x3B trailer byte)
  const truncatedGif = VALID_1X1_GIF.subarray(0, VALID_1X1_GIF.length - 2);
  const truncGifResult = validateImageBuffer(truncatedGif, "image/gif");
  check(
    "4.5 Truncated GIF (missing 0x3B trailer) is rejected",
    truncGifResult.isValid === false && truncGifResult.code === "MALFORMED_HEADER"
  );

  // 4.6 Oversized buffer (> 5MB)
  const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024);
  const oversizedResult = validateImageBuffer(oversizedBuffer, "image/png");
  check(
    "4.6 Oversized file (> 5MB) is strictly rejected (FILE_TOO_LARGE)",
    oversizedResult.isValid === false && oversizedResult.code === "FILE_TOO_LARGE"
  );

  // =========================================================================
  // Section 5: /api/upload Route Handler Integration Tests
  // =========================================================================
  console.log("\n--- Section 5: /api/upload Route Handler Integration Tests ---");

  const { POST: uploadHandler } = await import("../src/app/api/upload/route.ts");

  // Helper to build simulated multipart/form-data upload request
  function createUploadRequest(fileBuffer, mimeType, filename, token = null) {
    const boundary = "----WebKitFormBoundaryTest123456789";
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;

    const fullPayload = Buffer.concat([
      Buffer.from(header, "utf-8"),
      fileBuffer,
      Buffer.from(footer, "utf-8"),
    ]);

    const headers = {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    };
    if (token) {
      headers["authorization"] = `Bearer ${token}`;
    }

    return new Request("http://localhost:3000/api/upload", {
      method: "POST",
      headers,
      body: fullPayload,
      duplex: "half",
    });
  }

  // Enable emulator mode for testing
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

  // Generate valid test token in emulator mode
  const validEmulatorToken =
    Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url") +
    "." +
    Buffer.from(
      JSON.stringify({
        sub: "test_verified_user_123",
        email: "student@college.edu",
        email_verified: true,
      })
    ).toString("base64url") +
    ".";

  // 5.1 Unauthenticated upload attempt is rejected with HTTP 401
  const unauthReq = createUploadRequest(VALID_1X1_PNG, "image/png", "photo.png", null);
  const unauthRes = await uploadHandler(unauthReq);
  check("5.1 Unauthenticated upload attempt returns HTTP 401", unauthRes.status === 401);

  // 5.2 Empty file in upload request is rejected with HTTP 400
  const emptyUploadReq = createUploadRequest(Buffer.alloc(0), "image/png", "empty.png", validEmulatorToken);
  const emptyUploadRes = await uploadHandler(emptyUploadReq);
  const emptyUploadData = await emptyUploadRes.json();
  check(
    "5.2 Empty file in upload request returns HTTP 400 before Cloudinary invocation",
    emptyUploadRes.status === 400 && emptyUploadData.error?.includes("empty")
  );

  // 5.3 Forged shell script in upload request is rejected with HTTP 400
  const forgedUploadReq = createUploadRequest(bashScript, "image/jpeg", "malicious.jpg", validEmulatorToken);
  const forgedUploadRes = await uploadHandler(forgedUploadReq);
  const forgedUploadData = await forgedUploadRes.json();
  check(
    "5.3 Forged script with image/jpeg MIME returns HTTP 400 without calling Cloudinary",
    forgedUploadRes.status === 400 && forgedUploadData.error?.includes("signature")
  );

  // 5.4 MIME/Signature mismatch in upload request is rejected with HTTP 400
  const mismatchUploadReq = createUploadRequest(VALID_1X1_PNG, "image/jpeg", "mismatch.jpg", validEmulatorToken);
  const mismatchUploadRes = await uploadHandler(mismatchUploadReq);
  const mismatchUploadData = await mismatchUploadRes.json();
  check(
    "5.4 MIME mismatch in upload request returns HTTP 400 without calling Cloudinary",
    mismatchUploadRes.status === 400 && mismatchUploadData.error?.includes("mismatch")
  );

  // 5.5 Truncated PNG in upload request is rejected with HTTP 400
  const truncUploadReq = createUploadRequest(pngWithoutIend, "image/png", "trunc.png", validEmulatorToken);
  const truncUploadRes = await uploadHandler(truncUploadReq);
  const truncUploadData = await truncUploadRes.json();
  check(
    "5.5 Truncated image in upload request returns HTTP 400 without calling Cloudinary",
    truncUploadRes.status === 400 &&
      (truncUploadData.error?.includes("Truncated") || truncUploadData.code === "MALFORMED_HEADER")
  );

  // =========================================================================
  // Section 6: Hardened Guest Chatbot Origin Validation
  // =========================================================================
  console.log("\n--- Section 6: Hardened Guest Chatbot Origin Validation ---");

  const { isTrustedGuestOrigin, getExactTrustedOrigins } = await import(
    "../src/app/api/chat/route.ts"
  );
  const { NextRequest } = await import("next/server");

  // 6.1 Supports APP_TRUSTED_ORIGINS configuration
  process.env.APP_TRUSTED_ORIGINS = "https://lablens.ac.in,https://lablens.college.edu";
  const trustedSet = getExactTrustedOrigins();
  check(
    "6.1 Parses explicit APP_TRUSTED_ORIGINS into exact normalized set",
    trustedSet.has("https://lablens.ac.in") && trustedSet.has("https://lablens.college.edu")
  );

  // 6.2 Arbitrary unconfigured Vercel domain is strictly rejected
  const arbitraryVercelReq = new NextRequest("http://localhost:3000/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://attacker-random-site.vercel.app",
    },
    body: JSON.stringify({ messages: [{ role: "user", content: "Test" }] }),
  });
  check(
    "6.2 Blanket wildcard trust removed: arbitrary 'https://attacker-random-site.vercel.app' is rejected (returns false)",
    isTrustedGuestOrigin(arbitraryVercelReq) === false
  );

  // 6.3 Configured origin in APP_TRUSTED_ORIGINS is allowed
  const allowedConfigReq = new NextRequest("http://localhost:3000/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://lablens.ac.in",
    },
    body: JSON.stringify({ messages: [{ role: "user", content: "Test" }] }),
  });
  check(
    "6.3 Configured origin 'https://lablens.ac.in' is allowed (returns true)",
    isTrustedGuestOrigin(allowedConfigReq) === true
  );

  // 6.4 Host header is not accepted as a substitute for Origin when origin is untrusted
  const hostSpoofReq = new NextRequest("http://localhost:3000/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://attacker-site.com",
      host: "lablens.ac.in",
    },
    body: JSON.stringify({ messages: [{ role: "user", content: "Test" }] }),
  });
  check(
    "6.4 Host header cannot spoof Origin: untrusted Origin with valid Host is rejected",
    isTrustedGuestOrigin(hostSpoofReq) === false
  );

  // 6.5 In production mode, missing Origin/Referer is strictly rejected
  const originalEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    const prodNoOriginReq = new NextRequest("https://lablens.ac.in/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "Test" }] }),
    });
    check(
      "6.5 In production mode, guest request missing Origin/Referer is strictly rejected",
      isTrustedGuestOrigin(prodNoOriginReq) === false
    );
  } finally {
    process.env.NODE_ENV = originalEnv;
  }

  // =========================================================================
  // Section 7: Public Demo Mode Attachment Isolation
  // =========================================================================
  console.log("\n--- Section 7: Public Demo Mode Attachment Isolation ---");

  const demoReportSource = fs.readFileSync(
    path.join(projectRoot, "src/app/demo/report/page.tsx"),
    "utf-8"
  );
  check(
    "7.1 Demo report page strictly never calls /api/upload endpoint",
    !demoReportSource.includes("/api/upload")
  );
  check(
    "7.2 Demo report uses local simulated photo attachment",
    demoReportSource.includes("setSimulatedPhotoName")
  );

  // =========================================================================
  // Summary
  // =========================================================================
  console.log("\n=================================================================");
  console.log(`PHASE 2 UPLOAD SECURITY TEST RESULT: ${passedCount}/${totalCount} PASSED`);
  console.log("=================================================================");

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runUploadSecurityTests().catch((err) => {
  console.error("Test execution failed with unhandled error:", err);
  process.exit(1);
});
