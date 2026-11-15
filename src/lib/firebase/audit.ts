/**
 * Firestore Audit Logging Service for Administrative Actions
 *
 * Implements append-only audit records for all administrative ticket mutations:
 * - Status changes
 * - Priority & Category overrides
 * - Technician assignment & removal
 * - Admin notes modifications
 * - Report deletions
 *
 * All operations enforce strict immutability via Firestore Security Rules.
 */

import {
  collection,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  Timestamp,
  DocumentData,
  WriteBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./client";
import { AuditLogRecord, AuditActionType, AuditFieldChange } from "@/types";

function mapDocToAuditRecord(id: string, data: DocumentData): AuditLogRecord {
  const timestampIso =
    data.timestamp instanceof Timestamp
      ? data.timestamp.toDate().toISOString()
      : typeof data.timestamp === "string"
        ? data.timestamp
        : new Date().toISOString();

  return {
    id,
    action: data.action as AuditActionType,
    reportId: data.reportId || "",
    equipmentName: data.equipmentName || "Unknown Equipment",
    assetId: data.assetId || "N/A",
    performedBy: {
      uid: data.performedBy?.uid || "",
      name: data.performedBy?.name || "Administrator",
      email: data.performedBy?.email || "",
      role: "admin",
    },
    changes: Array.isArray(data.changes) ? (data.changes as AuditFieldChange[]) : [],
    timestamp: timestampIso,
  };
}

export interface CreateAuditInput {
  action: AuditActionType;
  reportId: string;
  equipmentName: string;
  assetId: string;
  performedBy: {
    uid: string;
    name: string;
    email: string;
  };
  changes: AuditFieldChange[];
}

/**
 * Appends an audit log creation operation into an existing Firestore WriteBatch.
 * Ensures report mutations and audit creation commit ATOMICALLY.
 */
export function appendAuditLogToBatch(
  batch: WriteBatch,
  input: CreateAuditInput
): string {
  const auditLogsCol = collection(db, "audit_logs");
  const auditDocRef = doc(auditLogsCol);

  batch.set(auditDocRef, {
    action: input.action,
    reportId: input.reportId,
    equipmentName: input.equipmentName,
    assetId: input.assetId,
    performedBy: {
      uid: input.performedBy.uid,
      name: input.performedBy.name,
      email: input.performedBy.email,
      role: "admin",
    },
    changes: input.changes,
    timestamp: serverTimestamp(),
  });

  return auditDocRef.id;
}

/**
 * Subscribes to real-time administrative audit logs (newest first).
 * Strictly accessible by verified administrators via Firestore Security Rules.
 */
export function subscribeAuditLogs(
  maxRecords = 50,
  onUpdate: (logs: AuditLogRecord[]) => void,
  onError?: (error: Error) => void
): () => void {
  const auditCol = collection(db, "audit_logs");
  const q = query(auditCol, orderBy("timestamp", "desc"), limit(maxRecords));

  return onSnapshot(
    q,
    (snapshot) => {
      const logs = snapshot.docs.map((d) => mapDocToAuditRecord(d.id, d.data()));
      onUpdate(logs);
    },
    (err) => {
      console.error("Firestore audit log subscription error:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetches recent audit logs once (for manual refresh or testing).
 */
export async function getAuditLogs(maxRecords = 50): Promise<AuditLogRecord[]> {
  const auditCol = collection(db, "audit_logs");
  const q = query(auditCol, orderBy("timestamp", "desc"), limit(maxRecords));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapDocToAuditRecord(d.id, d.data()));
}

