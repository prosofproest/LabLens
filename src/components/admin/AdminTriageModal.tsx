"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { FaultReport, ReportStatus, ReportPriority, EquipmentCategory } from "@/types";
import { AdminTriageInput } from "@/lib/firebase/reports";
import { Badge } from "@/components/ui/Badge";
import {
  X,
  Calendar,
  MapPin,
  Tag,
  User,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  Loader2,
  Check,
  ExternalLink,
} from "lucide-react";

interface AdminTriageModalProps {
  report: FaultReport | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveTriage: (reportId: string, update: AdminTriageInput) => Promise<void>;
  onDeleteReport: (reportId: string) => Promise<void>;
  isSimulated?: boolean;
}

const ALL_STATUSES: { value: ReportStatus; label: string }[] = [
  { value: "Reported", label: "Reported" },
  { value: "In-Review", label: "In Review" },
  { value: "Assigned", label: "Assigned" },
  { value: "In-Progress", label: "In Progress" },
  { value: "Resolved", label: "Resolved" },
  { value: "Cancelled", label: "Cancelled" },
];

const ALL_PRIORITIES: ReportPriority[] = ["Low", "Medium", "High", "Critical"];

const ALL_CATEGORIES: EquipmentCategory[] = [
  "Hardware",
  "Software",
  "Network",
  "Power/Electrical",
  "Peripheral",
  "Other",
];

const TECHNICIAN_SPECIALIZATION_SUGGESTIONS = [
  "Ramesh Kumar (Hardware Specialist)",
  "Priya Sharma (Network Specialist)",
  "Suresh Patel (Instrumentation Tech)",
  "Anil Verma (Power/Electrical Maintenance)",
];

function getPriorityVariant(p: ReportPriority) {
  switch (p) {
    case "Critical":
      return "critical";
    case "High":
      return "warning";
    case "Medium":
      return "info";
    case "Low":
      return "neutral";
  }
}

function getStatusVariant(st: ReportStatus) {
  switch (st) {
    case "Resolved":
      return "success";
    case "In-Progress":
    case "Assigned":
      return "warning";
    case "Cancelled":
      return "neutral";
    case "Reported":
    case "In-Review":
    default:
      return "info";
  }
}

interface AdminTriageModalContentProps {
  report: FaultReport;
  onClose: () => void;
  onSaveTriage: (reportId: string, update: AdminTriageInput) => Promise<void>;
  onDeleteReport: (reportId: string) => Promise<void>;
  isSimulated?: boolean;
}

function AdminTriageModalContent({
  report,
  onClose,
  onSaveTriage,
  onDeleteReport,
  isSimulated,
}: AdminTriageModalContentProps) {
  const [status, setStatus] = useState<ReportStatus>(report.status);
  const [priority, setPriority] = useState<ReportPriority>(report.priority);
  const [category, setCategory] = useState<EquipmentCategory>(
    report.category || report.aiAnalysis?.suggestedCategory || "Other"
  );
  const [assignedTechnician, setAssignedTechnician] = useState(report.assignedTechnician || "");
  const [adminNotes, setAdminNotes] = useState(report.adminNotes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      setIsSaving(true);

      const trimmedTech = assignedTechnician.trim();
      const previousTech = report.assignedTechnician?.trim() || "";

      let finalAssignedAt: string | null = null;
      if (trimmedTech) {
        if (previousTech && previousTech === trimmedTech) {
          // Technician unchanged: preserve existing timestamp
          finalAssignedAt = report.assignedAt || new Date().toISOString();
        } else {
          // Fresh assignment or reassignment: set fresh timestamp
          finalAssignedAt = new Date().toISOString();
        }
      } else {
        // Technician cleared: null
        finalAssignedAt = null;
      }

      await onSaveTriage(report.id, {
        status,
        priority,
        category,
        assignedTechnician: trimmedTech || null,
        assignedAt: finalAssignedAt,
        adminNotes: adminNotes.trim() || null,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save administrative triage updates.";
      setActionError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setActionError(null);
    try {
      setIsDeleting(true);
      await onDeleteReport(report.id);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete ticket.";
      setActionError(msg);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div
      className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-[#E5E5EA] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="bg-[#FAFAFC] px-6 py-4.5 border-b border-[#E5E5EA] flex items-center justify-between shrink-0">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="triage-modal-title" className="text-base font-semibold text-[#1D1D1F]">
              Administrative Triage & Dispatch
            </h2>
            {isSimulated ? (
              <Badge variant="warning" size="sm">
                Role Preview
              </Badge>
            ) : (
              <Badge variant="success" size="sm">
                Live Admin
              </Badge>
            )}
          </div>
          <p className="text-xs text-[#656565]">
            Ticket #{report.assetId} &bull; {report.equipmentName}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={isSaving || isDeleting}
          aria-label="Close triage modal"
          className="min-h-[44px] min-w-[44px] p-2 text-[#86868B] hover:text-[#1D1D1F] rounded-xl hover:bg-white transition-colors flex items-center justify-center cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Modal Scrollable Body */}
      <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-[#1D1D1F]">
        {/* Action Error Banner */}
        {actionError && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-xs text-[#DC2626]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{actionError}</p>
          </div>
        )}

        {/* Ticket Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA]">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-[#86868B] flex items-center gap-1">
              <Tag className="w-3 h-3 text-[#0071E3]" /> Asset Tag
            </span>
            <p className="font-mono font-medium text-[#1D1D1F] truncate">{report.assetId}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-[#86868B] flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#0071E3]" /> Location
            </span>
            <p className="font-medium text-[#1D1D1F] truncate">{report.labName}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-[#86868B] flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#0071E3]" /> Submitted
            </span>
            <p className="font-medium text-[#1D1D1F]">
              {new Date(report.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-[#86868B] flex items-center gap-1">
              <User className="w-3 h-3 text-[#0071E3]" /> Reporter
            </span>
            <p className="font-medium text-[#1D1D1F] truncate">{report.reportedBy.name}</p>
          </div>
        </div>

        {/* Description & Photo */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block">
            Reported Malfunction Symptoms
          </span>
          <div className="p-3.5 rounded-xl border border-[#E5E5EA] bg-[#FAFAFC] leading-relaxed text-[#1D1D1F] whitespace-pre-wrap">
            {report.description}
          </div>

          {report.imageUrl && (
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block mb-1.5">
                Attached Equipment Photo
              </span>
              <div className="relative w-full max-w-sm h-48 rounded-xl overflow-hidden border border-[#E5E5EA] bg-[#F5F5F7]">
                <Image
                  src={report.imageUrl}
                  alt="Equipment malfunction photo"
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-200"
                  unoptimized
                />
                <a
                  href={report.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute bottom-2 right-2 px-2.5 py-1.5 rounded-lg bg-black/60 text-white text-[11px] font-medium flex items-center gap-1 hover:bg-black/80 transition-colors min-h-[32px]"
                >
                  <ExternalLink className="w-3 h-3" /> View Full
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Groq AI Advisory Card */}
        {report.aiAnalysis && (
          <div className="rounded-2xl border border-[#B9E1FF] bg-[#F4F9FF] p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D0E7FF] pb-2">
              <div className="flex items-center gap-1.5 text-[#0071E3]">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-semibold">
                  Groq AI Triage Assessment (Advisory — Full Administrative Authority Retained)
                </span>
              </div>
              <Badge variant={report.aiAnalysis.status === "success" ? "info" : "neutral"} size="sm">
                {report.aiAnalysis.status === "success" ? "Automated Advisory" : "Triage Unavailable"}
              </Badge>
            </div>

            {report.aiAnalysis.status === "success" ? (
              <div className="space-y-2 text-xs text-[#1D1D1F]">
                <p className="leading-relaxed">
                  <strong className="text-[#0071E3]">Technical Summary:</strong> {report.aiAnalysis.executiveSummary}
                </p>
                <p className="leading-relaxed">
                  <strong className="text-[#0071E3]">Hypothesized Root Cause:</strong> {report.aiAnalysis.possibleRootCause}
                </p>
                <div className="p-2.5 rounded-lg bg-white border border-[#D0E7FF] text-[#1D1D1F] flex items-start gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#0071E3] shrink-0 mt-0.5" />
                  <span>
                    <strong>Safe Containment Protocol:</strong> {report.aiAnalysis.recommendedAction}
                  </span>
                </div>
                <p className="text-[10px] text-[#86868B] italic">
                  * AI assessments are qualitative advisory suggestions. Administrators can override priority below.
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#656565]">
                Automated symptom triage was unavailable at report submission time.
              </p>
            )}
          </div>
        )}

        {/* Triage Form Fields */}
        <div className="space-y-4 pt-2 border-t border-[#E5E5EA]">
          <span className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider block">
            Operational Lifecycle Triage
          </span>

          {/* Lifecycle Status & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Lifecycle Status (All 6 statuses preserved) */}
            <div className="space-y-1.5">
              <label htmlFor="triage-status" className="block text-xs font-semibold text-[#1D1D1F]">
                Lifecycle Status
              </label>
              <select
                id="triage-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ReportStatus)}
                disabled={isSaving || isDeleting}
                className="w-full min-h-[44px] px-3 py-2 text-xs bg-white border border-[#E5E5EA] rounded-xl focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/15 text-[#1D1D1F] font-medium"
              >
                {ALL_STATUSES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[11px] text-[#86868B]">Active Tag:</span>
                <Badge variant={getStatusVariant(status)} size="sm">
                  {status}
                </Badge>
              </div>
            </div>

            {/* Priority Override */}
            <div className="space-y-1.5">
              <label htmlFor="triage-priority" className="block text-xs font-semibold text-[#1D1D1F]">
                Priority Urgency
              </label>
              <select
                id="triage-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as ReportPriority)}
                disabled={isSaving || isDeleting}
                className="w-full min-h-[44px] px-3 py-2 text-xs bg-white border border-[#E5E5EA] rounded-xl focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/15 text-[#1D1D1F] font-medium"
              >
                {ALL_PRIORITIES.map((pr) => (
                  <option key={pr} value={pr}>
                    {pr} Priority
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[11px] text-[#86868B]">Active Urgency:</span>
                <Badge variant={getPriorityVariant(priority)} size="sm">
                  {priority}
                </Badge>
              </div>
            </div>

            {/* Operational Equipment Category Override */}
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="triage-category" className="block text-xs font-semibold text-[#1D1D1F]">
                Operational Equipment Category
              </label>
              <select
                id="triage-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
                disabled={isSaving || isDeleting}
                className="w-full min-h-[44px] px-3 py-2 text-xs bg-white border border-[#E5E5EA] rounded-xl focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/15 text-[#1D1D1F] font-medium"
              >
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
                <span className="text-[#86868B]">Original AI Recommendation:</span>
                <span className="font-medium text-[#0071E3]">
                  {report.aiAnalysis?.suggestedCategory || "Not specified"}
                </span>
                {report.aiAnalysis?.suggestedCategory && category !== report.aiAnalysis.suggestedCategory && (
                  <Badge variant="warning" size="sm" className="ml-1 text-[10px] py-0 px-1.5">
                    Category Overridden
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Technician Assignment */}
          <div className="space-y-1.5">
            <label htmlFor="technician-name" className="block text-xs font-semibold text-[#1D1D1F]">
              Assigned Technician (Staff Name & Specialization)
            </label>
            <input
              id="technician-name"
              type="text"
              value={assignedTechnician}
              onChange={(e) => setAssignedTechnician(e.target.value)}
              placeholder="e.g. Ramesh Kumar (Hardware Specialist)"
              maxLength={100}
              disabled={isSaving || isDeleting}
              className="w-full min-h-[44px] px-3.5 py-2 text-xs bg-white border border-[#E5E5EA] rounded-xl focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/15 text-[#1D1D1F] placeholder:text-[#86868B]"
            />

            {/* Specialization Preset Chips */}
            <div className="space-y-1 pt-1">
              <span className="text-[10px] text-[#86868B]">
                Specialization suggestions for dispatch entry:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TECHNICIAN_SPECIALIZATION_SUGGESTIONS.map((spec) => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => setAssignedTechnician(spec)}
                    disabled={isSaving || isDeleting}
                    className="px-2.5 py-1 text-[11px] rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] hover:bg-[#EBF5FF] hover:border-[#B9E1FF] text-[#1D1D1F] transition-colors cursor-pointer min-h-[32px] flex items-center"
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Administrative Notes */}
          <div className="space-y-1.5">
            <label htmlFor="admin-notes" className="block text-xs font-semibold text-[#1D1D1F]">
              Administrative Remarks & Resolution Notes
            </label>
            <textarea
              id="admin-notes"
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal maintenance log, replacement parts ordered, bench diagnostics..."
              maxLength={1000}
              disabled={isSaving || isDeleting}
              className="w-full p-3 text-xs bg-white border border-[#E5E5EA] rounded-xl focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/15 text-[#1D1D1F] placeholder:text-[#86868B] resize-none"
            />
            <span className="text-[10px] text-[#86868B] block text-right">
              {adminNotes.length}/1000 characters
            </span>
          </div>
        </div>

        {/* Delete Ticket Confirmation Dialog */}
        {showDeleteConfirm ? (
          <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] space-y-3">
            <div className="flex items-start gap-2.5 text-xs text-[#DC2626]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <h4 className="font-semibold text-sm">Permanently Delete Ticket?</h4>
                <p className="mt-0.5 leading-relaxed text-[#991B1B]">
                  Are you sure you want to delete ticket #{report.assetId} for {report.equipmentName}? This operation removes the report record permanently.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#DC2626] text-white text-xs font-semibold hover:bg-[#B91C1C] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Confirm Permanent Delete
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-[#E5E5EA] bg-white text-xs font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-2 flex justify-start">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSaving || isDeleting}
              className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Ticket
            </button>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="pt-4 border-t border-[#E5E5EA] flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving || isDeleting}
            className="min-h-[44px] px-5 py-2 rounded-xl border border-[#E5E5EA] bg-white text-xs font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || isDeleting}
            className="min-h-[44px] px-6 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving Triage...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> Save Triage Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export function AdminTriageModal({
  report,
  isOpen,
  onClose,
  onSaveTriage,
  onDeleteReport,
  isSimulated = false,
}: AdminTriageModalProps) {
  // Handle Escape key dismiss
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !report) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="triage-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <AdminTriageModalContent
        key={report.id}
        report={report}
        onClose={onClose}
        onSaveTriage={onSaveTriage}
        onDeleteReport={onDeleteReport}
        isSimulated={isSimulated}
      />
    </div>
  );
}
