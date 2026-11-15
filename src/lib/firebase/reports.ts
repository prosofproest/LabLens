import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  DocumentData,
} from "firebase/firestore";
import { db } from "./client";
import { CreateReportInput, FaultReport, ReportStatus, ReportPriority } from "@/types";

/**
 * Normalizes Firestore document snapshot into typed FaultReport
 */
function mapDocToFaultReport(id: string, data: DocumentData): FaultReport {
  const createdAtDate = data.createdAt instanceof Timestamp
    ? data.createdAt.toDate().toISOString()
    : typeof data.createdAt === "string"
      ? data.createdAt
      : new Date().toISOString();

  const updatedAtDate = data.updatedAt instanceof Timestamp
    ? data.updatedAt.toDate().toISOString()
    : typeof data.updatedAt === "string"
      ? data.updatedAt
      : new Date().toISOString();

  return {
    id,
    equipmentName: data.equipmentName || "Unknown Equipment",
    assetId: data.assetId || "N/A",
    labName: data.labName || "General Laboratory",
    description: data.description || "",
    imageUrl: data.imageUrl || undefined,
    imagePublicId: data.imagePublicId || undefined,
    reportedBy: {
      uid: data.reportedBy?.uid || "",
      name: data.reportedBy?.name || "Student User",
      email: data.reportedBy?.email || "",
      department: data.reportedBy?.department,
    },
    status: (data.status as ReportStatus) || "Reported",
    priority: (data.priority as ReportPriority) || "Medium",
    aiAnalysis: data.aiAnalysis || null,
    assignedTechnician: data.assignedTechnician || null,
    assignedAt: data.assignedAt || null,
    adminNotes: data.adminNotes || null,
    createdAt: createdAtDate,
    updatedAt: updatedAtDate,
  };
}

/**
 * Creates a new fault report document in Firestore
 */
export async function createFaultReport(
  input: CreateReportInput,
  reporter: {
    uid: string;
    name: string;
    email: string;
    department?: string;
  }
): Promise<string> {
  const reportsCol = collection(db, "reports");

  const reportData = {
    equipmentName: input.equipmentName.trim(),
    assetId: input.assetId.trim().toUpperCase(),
    labName: input.labName.trim(),
    description: input.description.trim(),
    imageUrl: input.imageUrl || null,
    imagePublicId: input.imagePublicId || null,
    reportedBy: {
      uid: reporter.uid,
      name: reporter.name,
      email: reporter.email,
      department: reporter.department || "",
    },
    status: "Reported",
    priority: "Medium", // Standard initial priority until Phase 4 AI automated triage
    aiAnalysis: null,
    assignedTechnician: null,
    assignedAt: null,
    adminNotes: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(reportsCol, reportData);
  return docRef.id;
}

/**
 * Subscribes to the authenticated user's reports reactively
 */
export function subscribeUserReports(
  userId: string,
  onUpdate: (reports: FaultReport[]) => void,
  onError?: (error: Error) => void
): () => void {
  // Query only reports created by this authenticated user
  const reportsCol = collection(db, "reports");
  const q = query(
    reportsCol,
    where("reportedBy.uid", "==", userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const reports = snapshot.docs.map((docSnap) =>
        mapDocToFaultReport(docSnap.id, docSnap.data())
      );
      // Sort client-side by date descending to ensure deterministic order
      reports.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      onUpdate(reports);
    },
    (err) => {
      console.error("Firestore reports subscription error:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetches user's reports as a single query
 */
export async function getUserReports(userId: string): Promise<FaultReport[]> {
  const reportsCol = collection(db, "reports");
  const q = query(reportsCol, where("reportedBy.uid", "==", userId));
  const snapshot = await getDocs(q);

  const reports = snapshot.docs.map((docSnap) =>
    mapDocToFaultReport(docSnap.id, docSnap.data())
  );

  reports.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return reports;
}

/**
 * Fetches a single report by its Document ID
 */
export async function getReportById(reportId: string): Promise<FaultReport | null> {
  const docRef = doc(db, "reports", reportId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    return null;
  }

  return mapDocToFaultReport(snap.id, snap.data());
}
