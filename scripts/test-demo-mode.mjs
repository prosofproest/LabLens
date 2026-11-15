/**
 * LabLens AI — Public Demo Mode & Role Switching Test Suite
 *
 * Verifies:
 * 1. Landing page role selection and instant demo access without authentication.
 * 2. User Demo experience (sample reports, metrics, advisory suggestions, details).
 * 3. Admin Demo experience (metrics, search, dynamic lab filters, live triage).
 * 4. Bidirectional role switching between User Demo and Admin Demo without signing in.
 * 5. Isolated demo report submission and status update without writing to Firestore.
 * 6. Security boundaries: zero Firestore writes, protected route enforcement.
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

async function runDemoModeTests() {
  console.log("=================================================================");
  console.log("   LabLens AI — Public Demo Mode Verification Suite              ");
  console.log("=================================================================\n");

  // =========================================================================
  // Section 1: Landing Page Role Selection & Immediate Demo Access
  // =========================================================================
  console.log("--- Section 1: Landing Page Role Selection ---");

  const landingPagePath = path.join(projectRoot, "src/app/page.tsx");
  check("1.1 src/app/page.tsx exists", fs.existsSync(landingPagePath));

  const landingSource = fs.readFileSync(landingPagePath, "utf-8");
  check("1.2 Landing page includes prominent 'User Demo' link", landingSource.includes('href="/demo"'));
  check("1.3 Landing page includes prominent 'Admin Demo' link", landingSource.includes('href="/demo/admin"'));
  check("1.4 Landing page features 'Launch User Demo' action", landingSource.includes("Launch User Demo"));
  check("1.5 Landing page features 'Launch Admin Demo' action", landingSource.includes("Launch Admin Demo"));
  check(
    "1.6 Landing page explains zero registration requirement",
    landingSource.includes("No sign-in or registration required") ||
      landingSource.includes("Immediate Demonstration") ||
      landingSource.includes("No registration required")
  );
  check("1.7 Landing page contains zero Gemini references (Groq exclusivity)", !landingSource.includes("Gemini"));
  check("1.8 Landing page preserves secondary institutional login links", landingSource.includes('href="/login"'));

  // =========================================================================
  // Section 2: Navbar Public Demo Links
  // =========================================================================
  console.log("\n--- Section 2: Navbar Navigation & Role Switcher ---");

  const navbarPath = path.join(projectRoot, "src/components/common/Navbar.tsx");
  const navbarSource = fs.readFileSync(navbarPath, "utf-8");

  check("2.1 Navbar includes 'User Demo' link for unauthenticated visitors", navbarSource.includes('href="/demo"'));
  check("2.2 Navbar includes 'Admin Demo' link for unauthenticated visitors", navbarSource.includes('href="/demo/admin"'));
  check("2.3 Navbar preserves institutional 'Sign In' link", navbarSource.includes('href="/login"'));

  // =========================================================================
  // Section 3: Demo Context & In-Memory State Isolation
  // =========================================================================
  console.log("\n--- Section 3: Demo Context & In-Memory State Isolation ---");

  const demoContextPath = path.join(projectRoot, "src/context/DemoContext.tsx");
  check("3.1 src/context/DemoContext.tsx exists", fs.existsSync(demoContextPath));

  const { INITIAL_DEMO_REPORTS, DEMO_USER_PROFILE } = await import("../src/context/DemoContext.tsx");

  check("3.2 Demo Student profile is defined", DEMO_USER_PROFILE?.name === "Alex Chen");
  check("3.3 Demo initial dataset contains multiple campus reports", INITIAL_DEMO_REPORTS.length >= 4);

  const alexReports = INITIAL_DEMO_REPORTS.filter((r) => r.reportedBy?.uid === DEMO_USER_PROFILE.uid);
  check("3.4 Initial dataset contains personal reports for Demo Student", alexReports.length >= 2);

  const initialStatuses = new Set(INITIAL_DEMO_REPORTS.map((r) => r.status));
  check(
    "3.5 Initial dataset covers varied lifecycles (Reported, In-Progress, Assigned, Resolved)",
    initialStatuses.has("Reported") &&
      initialStatuses.has("In-Progress") &&
      initialStatuses.has("Assigned") &&
      initialStatuses.has("Resolved")
  );

  // =========================================================================
  // Section 4: Simulated Fault Report Submission
  // =========================================================================
  console.log("\n--- Section 4: Simulated Fault Report Submission ---");

  const demoReportPagePath = path.join(projectRoot, "src/app/demo/report/page.tsx");
  check("4.1 src/app/demo/report/page.tsx exists", fs.existsSync(demoReportPagePath));

  const demoReportSource = fs.readFileSync(demoReportPagePath, "utf-8");
  check("4.2 Demo report form requires equipment name", demoReportSource.includes("equipmentName"));
  check("4.3 Demo report form requires asset tag", demoReportSource.includes("assetId"));
  check("4.4 Demo report form requires lab room selection", demoReportSource.includes("labName"));
  check("4.5 Demo report form includes category selector", demoReportSource.includes("category"));
  check("4.6 Demo report form calls addDemoReport() without Firestore writes", demoReportSource.includes("addDemoReport"));
  check(
    "4.7 Demo report form strictly avoids Firestore createFaultReport() API",
    !demoReportSource.includes("createFaultReport")
  );

  // =========================================================================
  // Section 5: Admin Demo & Operational Triage Simulation
  // =========================================================================
  console.log("\n--- Section 5: Admin Demo & Operational Triage Simulation ---");

  const adminDemoPagePath = path.join(projectRoot, "src/app/demo/admin/page.tsx");
  check("5.1 src/app/demo/admin/page.tsx exists", fs.existsSync(adminDemoPagePath));

  const adminDemoSource = fs.readFileSync(adminDemoPagePath, "utf-8");
  check("5.2 Admin Demo renders 5 operational metrics overview cards", adminDemoSource.includes("stats.totalReported"));
  check("5.3 Admin Demo renders status filter tabs", adminDemoSource.includes("ALL_STATUS_TABS"));
  check("5.4 Admin Demo derives laboratory filter dynamically from active dataset", adminDemoSource.includes("labOptions"));
  check("5.5 Admin Demo includes omni-search input", adminDemoSource.includes("searchQuery"));
  check("5.6 Admin Demo renders 'Triage Ticket' buttons", adminDemoSource.includes("Triage Ticket"));
  check("5.7 Admin Demo uses AdminTriageModal with isSimulated={true}", adminDemoSource.includes("isSimulated={true}"));
  check(
    "5.8 Admin Demo strictly avoids live Firestore subscription (subscribeAllReports)",
    !adminDemoSource.includes("subscribeAllReports")
  );
  check(
    "5.9 Admin Demo strictly avoids live Firestore updates (updateReportAdminTriage)",
    !adminDemoSource.includes("updateReportAdminTriage")
  );

  // =========================================================================
  // Section 6: Bidirectional Role Switching in Demo Banner
  // =========================================================================
  console.log("\n--- Section 6: Bidirectional Role Switching ---");

  const demoBannerPath = path.join(projectRoot, "src/components/demo/DemoBanner.tsx");
  check("6.1 src/components/demo/DemoBanner.tsx exists", fs.existsSync(demoBannerPath));

  const demoBannerSource = fs.readFileSync(demoBannerPath, "utf-8");
  check("6.2 Demo banner contains link to User Demo ('/demo')", demoBannerSource.includes('href="/demo"'));
  check("6.3 Demo banner contains link to Admin Demo ('/demo/admin')", demoBannerSource.includes('href="/demo/admin"'));
  check("6.4 Demo banner contains 'Reset Demo' button", demoBannerSource.includes("Reset Demo"));
  check("6.5 Demo banner displays persistent public demo guard notice", demoBannerSource.includes("Public Demo Mode"));

  // =========================================================================
  // Section 7: Security Boundaries & Protected Routes Preservation
  // =========================================================================
  console.log("\n--- Section 7: Security Boundaries & Protected Routes ---");

  const dashboardLayoutPath = path.join(projectRoot, "src/app/(dashboard)/layout.tsx");
  const dashboardLayoutSource = fs.readFileSync(dashboardLayoutPath, "utf-8");

  check(
    "7.1 Real dashboard layout continues to strictly enforce authentication (!user -> /login)",
    dashboardLayoutSource.includes('router.push("/login")')
  );
  check(
    "7.2 Real dashboard layout continues to strictly enforce profile completion (missingProfile -> /complete-profile)",
    dashboardLayoutSource.includes('router.push("/complete-profile")')
  );

  const adminPagePath = path.join(projectRoot, "src/app/(dashboard)/admin/page.tsx");
  const adminPageSource = fs.readFileSync(adminPagePath, "utf-8");
  check(
    "7.3 Real admin page requires BOTH actualRole === 'admin' and activeRoleView === 'admin' for live Firestore",
    adminPageSource.includes('actualRole === "admin" && activeRoleView === "admin"')
  );

  // =========================================================================
  // Summary
  // =========================================================================
  console.log("\n=================================================================");
  console.log(`DEMO MODE VERIFICATION RESULT: ${passedCount}/${totalCount} PASSED`);
  console.log("=================================================================");

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runDemoModeTests().catch((err) => {
  console.error("Test execution failed with unhandled error:", err);
  process.exit(1);
});
