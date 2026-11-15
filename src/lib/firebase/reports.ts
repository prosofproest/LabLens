import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  writeBatch,
  getCountFromServer,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "./client";
import {
  CreateReportInput,
  FaultReport,
  ReportStatus,
  ReportPriority,
  EquipmentCategory,
  AuditActionType,
  AuditFieldChange,
} from "@/types";
import { appendAuditLogToBatch } from "./audit";

/**
 * Normalizes Firestore document snapshot into typed FaultReport
 */
function mapDocToFaultReport(id: string, data: DocumentData): FaultReport {
  const createdAtDate =
    data.createdAt instanceof Timestamp
      ? data.createdAt.toDate().toISOString()
      : typeof data.createdAt === "string"
        ? data.createdAt
        : new Date().toISOString();

  const updatedAtDate =
    data.updatedAt instanceof Timestamp
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
    category: (data.category as EquipmentCategory) || undefined,
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
    priority: input.aiAnalysis?.suggestedPriority || "Medium",
    aiAnalysis: input.aiAnalysis || null,
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
 * Subscribes to the authenticated user's reports reactively (windowed newest-first).
 */
export function subscribeUserReports(
  userId: string,
  onUpdate: (reports: FaultReport[], lastSnapshot?: QueryDocumentSnapshot | null) => void,
  onError?: (error: Error) => void,
  pageSize = 25
): () => void {
  const reportsCol = collection(db, "reports");
  const q = query(
    reportsCol,
    where("reportedBy.uid", "==", userId),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const reports = snapshot.docs.map((docSnap) =>
        mapDocToFaultReport(docSnap.id, docSnap.data())
      );
      // Secondary client-side sort ensures strict deterministic ordering
      reports.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const lastSnap = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
      onUpdate(reports, lastSnap);
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
export async function getUserReports(userId: string, pageSize = 25): Promise<FaultReport[]> {
  const reportsCol = collection(db, "reports");
  const q = query(
    reportsCol,
    where("reportedBy.uid", "==", userId),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );
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

export interface AdminTriageInput {
  status: ReportStatus;
  priority: ReportPriority;
  category?: EquipmentCategory;
  assignedTechnician?: string | null;
  assignedAt?: string | null;
  adminNotes?: string | null;
}

export interface AdminActor {
  uid: string;
  name: string;
  email: string;
}

/**
 * Subscribes to reports in real-time with newest-first windowing of 25 records.
 * Strictly intended for verified administrators.
 */
export function subscribeAllReports(
  onUpdate: (reports: FaultReport[], lastSnapshot?: QueryDocumentSnapshot | null) => void,
  onError?: (error: Error) => void,
  pageSize = 25
): () => void {
  const reportsCol = collection(db, "reports");
  const q = query(
    reportsCol,
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const reports = snapshot.docs.map((docSnap) =>
        mapDocToFaultReport(docSnap.id, docSnap.data())
      );
      // Secondary client-side deterministic sort
      reports.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const lastSnap = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
      onUpdate(reports, lastSnap);
    },
    (err) => {
      console.error("Firestore admin reports subscription error:", err);
      if (onError) onError(err);
    }
  );
}

export interface PaginatedReportsPage {
  reports: FaultReport[];
  lastVisibleSnapshot: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Cursor-based pagination to fetch older historical records.
 */
export async function fetchNextReportsPage(
  lastDoc: QueryDocumentSnapshot,
  pageSize = 25,
  filterStatus?: string,
  filterLab?: string
): Promise<PaginatedReportsPage> {
  const reportsCol = collection(db, "reports");
  const constraints: QueryConstraint[] = [];

  if (filterStatus && filterStatus !== "all") {
    constraints.push(where("status", "==", filterStatus));
  }
  if (filterLab && filterLab !== "all") {
    constraints.push(where("labName", "==", filterLab));
  }

  constraints.push(
    orderBy("createdAt", "desc"),
    startAfter(lastDoc),
    limit(pageSize)
  );

  const q = query(reportsCol, ...constraints);
  const snapshot = await getDocs(q);

  const reports = snapshot.docs.map((docSnap) =>
    mapDocToFaultReport(docSnap.id, docSnap.data())
  );
  reports.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const newLastSnap = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

  return {
    reports,
    lastVisibleSnapshot: newLastSnap,
    hasMore: snapshot.docs.length === pageSize,
  };
}

export interface GlobalAdminMetrics {
  totalReported: number;
  pendingReview: number;
  inProgress: number;
  resolved: number;
  criticalUrgency: number;
}

/**
 * Calculates accurate institutional metrics across the entire collection
 * using native Firestore aggregation queries (getCountFromServer).
 * NEVER calculates global metrics from only the current page!
 */
export async function getGlobalAdminMetrics(): Promise<GlobalAdminMetrics> {
  const reportsCol = collection(db, "reports");

  const [
    totalSnap,
    reportedSnap,
    inReviewSnap,
    assignedSnap,
    inProgressSnap,
    resolvedSnap,
    criticalSnap,
  ] = await Promise.all([
    getCountFromServer(reportsCol),
    getCountFromServer(query(reportsCol, where("status", "==", "Reported"))),
    getCountFromServer(query(reportsCol, where("status", "==", "In-Review"))),
    getCountFromServer(query(reportsCol, where("status", "==", "Assigned"))),
    getCountFromServer(query(reportsCol, where("status", "==", "In-Progress"))),
    getCountFromServer(query(reportsCol, where("status", "==", "Resolved"))),
    getCountFromServer(query(reportsCol, where("priority", "==", "Critical"))),
  ]);

  return {
    totalReported: totalSnap.data().count,
    pendingReview: reportedSnap.data().count + inReviewSnap.data().count,
    inProgress: assignedSnap.data().count + inProgressSnap.data().count,
    resolved: resolvedSnap.data().count,
    criticalUrgency: criticalSnap.data().count,
  };
}

/**
 * Updates a report's administrative triage fields and atomically records an audit log entry.
 * Strictly permitted for verified administrators via Firestore Security Rules.
 */
export async function updateReportAdminTriage(
  reportId: string,
  update: AdminTriageInput,
  adminActor?: AdminActor
): Promise<void> {
  const docRef = doc(db, "reports", reportId);

  const payload: Record<string, unknown> = {
    status: update.status,
    priority: update.priority,
    assignedTechnician: update.assignedTechnician ? update.assignedTechnician.trim() : null,
    assignedAt:
      update.assignedAt !== undefined
        ? update.assignedAt
        : update.assignedTechnician
          ? new Date().toISOString()
          : null,
    adminNotes: update.adminNotes ? update.adminNotes.trim() : null,
    updatedAt: serverTimestamp(),
  };

  if (update.category) {
    payload.category = update.category;
  }

  // If adminActor is supplied, execute update and audit creation atomically in a batch
  if (adminActor && adminActor.uid) {
    const prevSnap = await getDoc(docRef);
    if (!prevSnap.exists()) {
      throw new Error(`Report ${reportId} not found.`);
    }
    const prevData = prevSnap.data();

    const changes: AuditFieldChange[] = [];
    if (prevData.status !== update.status) {
      changes.push({ field: "status", previousValue: prevData.status || null, newValue: update.status });
    }
    if (prevData.priority !== update.priority) {
      changes.push({ field: "priority", previousValue: prevData.priority || null, newValue: update.priority });
    }
    if (update.category && prevData.category !== update.category) {
      changes.push({ field: "category", previousValue: prevData.category || null, newValue: update.category });
    }
    const newTech = update.assignedTechnician ? update.assignedTechnician.trim() : null;
    const oldTech = prevData.assignedTechnician || null;
    if (oldTech !== newTech) {
      changes.push({ field: "assignedTechnician", previousValue: oldTech, newValue: newTech });
    }
    const newNotes = update.adminNotes ? update.adminNotes.trim() : null;
    const oldNotes = prevData.adminNotes || null;
    if (oldNotes !== newNotes) {
      changes.push({ field: "adminNotes", previousValue: oldNotes, newValue: newNotes });
    }

    let action: AuditActionType = "STATUS_CHANGE";
    if (oldTech !== newTech) {
      action = newTech ? "TECHNICIAN_ASSIGNMENT" : "TECHNICIAN_REMOVAL";
    } else if (prevData.priority !== update.priority) {
      action = "PRIORITY_OVERRIDE";
    } else if (update.category && prevData.category !== update.category) {
      action = "CATEGORY_OVERRIDE";
    } else if (oldNotes !== newNotes) {
      action = "ADMIN_NOTE_CHANGE";
    }

    const batch = writeBatch(db);
    batch.update(docRef, payload);

    appendAuditLogToBatch(batch, {
      action,
      reportId,
      equipmentName: prevData.equipmentName || "Unknown Equipment",
      assetId: prevData.assetId || "N/A",
      performedBy: {
        uid: adminActor.uid,
        name: adminActor.name || "Administrator",
        email: adminActor.email || "",
      },
      changes,
    });

    await batch.commit();
  } else {
    // Fallback direct update for non-audited scripts
    await updateDoc(docRef, payload);
  }
}

/**
 * Atomically deletes a report document and creates the audit log record in the same operation.
 * Strictly permitted for verified administrators via Firestore Security Rules.
 */
export async function deleteReportAdmin(
  reportId: string,
  adminActor?: AdminActor
): Promise<void> {
  const docRef = doc(db, "reports", reportId);

  if (adminActor && adminActor.uid) {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const prevData = snap.data();
      const batch = writeBatch(db);

      appendAuditLogToBatch(batch, {
        action: "REPORT_DELETED",
        reportId,
        equipmentName: prevData.equipmentName || "Unknown Equipment",
        assetId: prevData.assetId || "N/A",
        performedBy: {
          uid: adminActor.uid,
          name: adminActor.name || "Administrator",
          email: adminActor.email || "",
        },
        changes: [
          { field: "status", previousValue: prevData.status || "Reported", newValue: "DELETED" },
        ],
      });

      batch.delete(docRef);
      await batch.commit();
      return;
    }
  }

  await deleteDoc(docRef);
}
