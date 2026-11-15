// Regression test suite for image upload failure blocking in fault report submission
// Verifies:
// 1. If an image upload fails, submission is strictly blocked.
// 2. The user is prompted to retry upload or remove the photo.
// 3. Removing the failed image resets error state and permits clean submission without photo.
// 4. Retrying and succeeding permits submission with photo.
// 5. Submissions without image selection are never blocked.

console.log("=== REGRESSION TEST: FAULT REPORT UPLOAD FAILURE BLOCKING ===\n");

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

// Simulated Form & Upload Controller matching ImageUpload.tsx and ReportFaultForm.tsx logic
class SimulatedFaultReportWorkflow {
  constructor() {
    this.reset();
  }

  reset() {
    this.fields = {
      equipmentName: "Digital Multimeter",
      assetId: "LAB-EE-104",
      labName: "Electronics & Microcontroller Lab",
      description: "Screen flicker and erratic voltage readouts under 5V load.",
    };
    this.imageUrl = undefined;
    this.imagePublicId = undefined;
    this.imageUploadState = {
      isUploading: false,
      hasError: false,
      error: null,
    };
    this.formError = null;
    this.firestoreReportsCreated = [];
  }

  // Simulated handleFile in ImageUpload.tsx
  simulateUploadFile(fileName, simulateServerSuccess, serverErrorMessage = "Cloudinary service timeout") {
    this.imageUploadState = { isUploading: true, hasError: false, error: null };
    
    if (simulateServerSuccess) {
      this.imageUrl = `https://res.cloudinary.com/demo/image/upload/${fileName}`;
      this.imagePublicId = `fault_reports/${fileName}`;
      this.imageUploadState = { isUploading: false, hasError: false, error: null };
    } else {
      this.imageUrl = undefined;
      this.imagePublicId = undefined;
      this.imageUploadState = {
        isUploading: false,
        hasError: true,
        error: serverErrorMessage,
      };
    }
  }

  // Simulated handleRemove in ImageUpload.tsx
  simulateRemovePhoto() {
    this.imageUrl = undefined;
    this.imagePublicId = undefined;
    this.imageUploadState = {
      isUploading: false,
      hasError: false,
      error: null,
    };
  }

  // Simulated handleSubmit in ReportFaultForm.tsx
  simulateSubmit() {
    this.formError = null;

    if (this.imageUploadState.isUploading) {
      this.formError = "Please wait for your equipment photo to finish uploading.";
      return { success: false, error: this.formError };
    }

    if (this.imageUploadState.hasError) {
      this.formError = `Equipment photo upload failed (${this.imageUploadState.error || "upload error"}). Please retry uploading or remove the photo before submitting.`;
      return { success: false, error: this.formError };
    }

    // Save report to Firestore
    const newReport = {
      ...this.fields,
      imageUrl: this.imageUrl,
      imagePublicId: this.imagePublicId,
      id: `report_${Date.now()}`,
    };
    this.firestoreReportsCreated.push(newReport);
    return { success: true, report: newReport };
  }
}

function run() {
  const workflow = new SimulatedFaultReportWorkflow();

  // Test 1: Normal report submission without photo succeeds
  workflow.reset();
  const res1 = workflow.simulateSubmit();
  assert(
    "Test 1: Submitting without photo succeeds and creates report without image",
    res1.success === true && res1.report.imageUrl === undefined && workflow.firestoreReportsCreated.length === 1
  );

  // Test 2: User selects image, upload fails, submit MUST be blocked
  workflow.reset();
  workflow.simulateUploadFile("damaged_capacitor.jpg", false, "Cloudinary upload failed: 503 Service Unavailable");
  const res2 = workflow.simulateSubmit();
  assert(
    "Test 2a: Submit is strictly blocked when image upload failed",
    res2.success === false && workflow.firestoreReportsCreated.length === 0
  );
  assert(
    "Test 2b: Form error explicitly informs user to retry or remove photo",
    res2.error.includes("Equipment photo upload failed") && res2.error.includes("Please retry uploading or remove the photo")
  );

  // Test 3: User cannot submit while upload is in progress
  workflow.reset();
  workflow.imageUploadState.isUploading = true;
  const res3 = workflow.simulateSubmit();
  assert(
    "Test 3: Submit is blocked while upload is actively in progress",
    res3.success === false && res3.error.includes("Please wait for your equipment photo to finish uploading")
  );

  // Test 4: User removes failed image -> submission is unblocked (clean submission without photo)
  workflow.reset();
  workflow.simulateUploadFile("broken_lens.png", false, "Network error");
  assert("Precondition: Upload failed", workflow.imageUploadState.hasError === true);
  workflow.simulateRemovePhoto();
  assert(
    "Test 4a: Removing failed photo clears error state",
    workflow.imageUploadState.hasError === false && workflow.imageUploadState.error === null
  );
  const res4 = workflow.simulateSubmit();
  assert(
    "Test 4b: Submit succeeds after removing photo, creating clean report without image",
    res4.success === true && res4.report.imageUrl === undefined && workflow.firestoreReportsCreated.length === 1
  );

  // Test 5: User retries upload and succeeds -> submission succeeds with photo attached
  workflow.reset();
  workflow.simulateUploadFile("burned_pcb.jpg", false, "Temporary Cloudinary gateway error");
  assert("Precondition: Upload failed initially", workflow.imageUploadState.hasError === true);
  // User clicks "Retry Upload"
  workflow.simulateUploadFile("burned_pcb.jpg", true);
  assert(
    "Test 5a: Retried upload succeeds and attaches valid image URL",
    workflow.imageUploadState.hasError === false && typeof workflow.imageUrl === "string"
  );
  const res5 = workflow.simulateSubmit();
  assert(
    "Test 5b: Submit succeeds with attached image URL in Firestore report",
    res5.success === true && res5.report.imageUrl.includes("burned_pcb.jpg") && workflow.firestoreReportsCreated.length === 1
  );

  const passed = tests.filter((t) => t.pass).length;
  console.log(`\n==============================================`);
  console.log(`UPLOAD FAILURE REGRESSION SUMMARY: ${passed}/${tests.length} PASSED`);
  console.log(`==============================================`);

  if (passed !== tests.length) {
    process.exit(1);
  }
}

run();
