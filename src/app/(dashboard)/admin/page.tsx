"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonStyles } from "@/components/ui/Button";
import { MOCK_ADMIN_REPORTS } from "@/lib/mockAdminData";
import {
  subscribeAllReports,
  updateReportAdminTriage,
  deleteReportAdmin,
  AdminTriageInput,
} from "@/lib/firebase/reports";
import { FaultReport, ReportStatus, ReportPriority } from "@/types";
import { AdminTriageModal } from "@/components/admin/AdminTriageModal";
import {
  ShieldCheck,
  Filter,
  Monitor,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  UserCheck,
  ArrowLeft,
  Search,
  Clock,
  Wrench,
  Loader2,
  RotateCcw,
} from "lucide-react";

const ALL_STATUS_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All Tickets" },
  { value: "Reported", label: "Reported" },
  { value: "In-Review", label: "In Review" },
  { value: "Assigned", label: "Assigned" },
  { value: "In-Progress", label: "In Progress" },
  { value: "Resolved", label: "Resolved" },
  { value: "Cancelled", label: "Cancelled" },
];

const ALL_PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Priorities" },
  { value: "Critical", label: "Critical" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

export default function AdminDashboardPage() {
  const { userProfile, actualRole, activeRoleView, setActiveRoleView } = useAuth();

  // Strict authorization vs. preview separation
  const isLiveAdmin = actualRole === "admin";
  const isPreview = !isLiveAdmin && activeRoleView === "admin";
  const isAuthorized = isLiveAdmin || isPreview;

  // Live Admin data state
  const [liveReports, setLiveReports] = useState<FaultReport[]>([]);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(true);
  const [liveError, setLiveError] = useState<string | null>(null);

  // Role Preview local data state (completely isolated from Firestore)
  const [mockReports, setMockReports] = useState<FaultReport[]>(MOCK_ADMIN_REPORTS);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterLab, setFilterLab] = useState<string>("all");

  // Triage Modal State
  const [selectedReport, setSelectedReport] = useState<FaultReport | null>(null);
  const [isTriageOpen, setIsTriageOpen] = useState(false);

  // 1. Live Firestore Subscription (Only for authenticated administrators)
  useEffect(() => {
    if (!isLiveAdmin) return;

    const unsubscribe = subscribeAllReports(
      (reports) => {
        setLiveReports(reports);
        setIsLoadingLive(false);
        setLiveError(null);
      },
      (err) => {
        console.error("Admin live reports listener error:", err);
        setLiveError("Failed to synchronize live reports from Firestore.");
        setIsLoadingLive(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isLiveAdmin]);

  // 2. Derive active reports dataset
  const activeReports = useMemo(() => {
    return isLiveAdmin ? liveReports : mockReports;
  }, [isLiveAdmin, liveReports, mockReports]);

  // 3. Derive lab filter options dynamically from actual labName values in active dataset
  const availableLabs = useMemo(() => {
    const labs = new Set<string>();
    for (const r of activeReports) {
      if (r.labName && r.labName.trim()) {
        labs.add(r.labName.trim());
      }
    }
    return Array.from(labs).sort();
  }, [activeReports]);

  // 4. Analytics Aggregations (Strict Formulas)
  const metrics = useMemo(() => {
    const totalReported = activeReports.length;
    const pendingReview = activeReports.filter(
      (r) => r.status === "Reported" || r.status === "In-Review"
    ).length;
    const inProgress = activeReports.filter(
      (r) => r.status === "Assigned" || r.status === "In-Progress"
    ).length;
    const resolved = activeReports.filter((r) => r.status === "Resolved").length;
    const criticalUrgency = activeReports.filter((r) => r.priority === "Critical").length;

    return {
      totalReported,
      pendingReview,
      inProgress,
      resolved,
      criticalUrgency,
    };
  }, [activeReports]);

  // 5. Filter & Search execution
  const filteredReports = useMemo(() => {
    return activeReports.filter((report) => {
      // Status filter
      if (filterStatus !== "all" && report.status !== filterStatus) {
        return false;
      }

      // Priority filter
      if (filterPriority !== "all" && report.priority !== filterPriority) {
        return false;
      }

      // Lab filter
      if (filterLab !== "all" && report.labName !== filterLab) {
        return false;
      }

      // Search query (omni-search)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesEquipment = report.equipmentName.toLowerCase().includes(q);
        const matchesAsset = report.assetId.toLowerCase().includes(q);
        const matchesLab = report.labName.toLowerCase().includes(q);
        const matchesReporter = report.reportedBy.name.toLowerCase().includes(q) ||
          report.reportedBy.email.toLowerCase().includes(q);
        const matchesTech = (report.assignedTechnician || "").toLowerCase().includes(q);
        const matchesDesc = report.description.toLowerCase().includes(q);

        if (!matchesEquipment && !matchesAsset && !matchesLab && !matchesReporter && !matchesTech && !matchesDesc) {
          return false;
        }
      }

      return true;
    });
  }, [activeReports, filterStatus, filterPriority, filterLab, searchQuery]);

  // 6. Administrative Actions: Live vs. Simulated Triage
  const handleSaveTriage = useCallback(
    async (reportId: string, update: AdminTriageInput) => {
      if (isLiveAdmin) {
        // Execute real Firestore update
        await updateReportAdminTriage(reportId, update);
      } else {
        // Simulate local state update in Preview mode (no Firestore writes)
        setMockReports((prev) =>
          prev.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  status: update.status,
                  priority: update.priority,
                  assignedTechnician: update.assignedTechnician || null,
                  assignedAt: update.assignedAt || (update.assignedTechnician ? new Date().toISOString() : null),
                  adminNotes: update.adminNotes || null,
                  updatedAt: new Date().toISOString(),
                }
              : r
          )
        );
      }
    },
    [isLiveAdmin]
  );

  const handleDeleteReport = useCallback(
    async (reportId: string) => {
      if (isLiveAdmin) {
        // Execute real Firestore deletion
        await deleteReportAdmin(reportId);
      } else {
        // Simulate local state deletion in Preview mode (no Firestore writes)
        setMockReports((prev) => prev.filter((r) => r.id !== reportId));
      }
    },
    [isLiveAdmin]
  );

  const handleOpenTriage = (report: FaultReport) => {
    setSelectedReport(report);
    setIsTriageOpen(true);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterPriority("all");
    setFilterLab("all");
  };

  const getPriorityVariant = (p: ReportPriority) => {
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
  };

  const getStatusVariant = (st: ReportStatus) => {
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
  };

  // If a standard user visits /admin without Role Preview enabled:
  if (!isAuthorized) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8">
        <div className="w-14 h-14 rounded-2xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-semibold text-[#1D1D1F] mb-2">
          Administrative Privileges Required
        </h1>
        <p className="text-xs text-[#656565] max-w-md leading-relaxed mb-6">
          Access to the Operations Hub requires an administrative role. If you are demonstrating the platform, you can switch to Admin Preview Mode.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveRoleView("admin")}
            className={buttonStyles({ variant: "primary", size: "md" })}
          >
            Enable Admin Preview
          </button>
          <Link
            href="/dashboard"
            className={buttonStyles({ variant: "outline", size: "md" })}
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Role Preview Amber Banner (Strictly visible only in simulation) */}
      {isPreview && (
        <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex flex-wrap items-center justify-between gap-3 text-xs text-[#92400E]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
            <div>
              <strong>Admin Role Preview Active:</strong> Demonstrating administrative triage using local demonstration data. Real administrative Firestore queries and writes are completely disabled.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveRoleView("user")}
            className="px-3.5 py-1.5 rounded-xl border border-[#FDE68A] bg-white hover:bg-[#FEF3C7] text-xs font-semibold text-[#92400E] transition-colors min-h-[36px] flex items-center cursor-pointer"
          >
            Exit Admin Preview
          </button>
        </div>
      )}

      {/* Admin Operations Header */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0071E3] flex items-center justify-center text-white">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#1D1D1F]">
              Administrative Operations Hub
            </h1>
            {isLiveAdmin ? (
              <Badge variant="success" size="sm">
                Live Admin Mode
              </Badge>
            ) : (
              <Badge variant="warning" size="sm">
                Demonstration Preview
              </Badge>
            )}
          </div>
          <p className="text-xs text-[#656565] max-w-xl leading-relaxed">
            Centralized laboratory triage, technician dispatches, and equipment lifecycle tracking across campus engineering facilities.
          </p>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center gap-3">
          {actualRole === "user" && (
            <button
              type="button"
              onClick={() => setActiveRoleView("user")}
              className={buttonStyles({ variant: "outline", size: "sm" })}
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back to User View
            </button>
          )}
          <span className="text-xs text-[#86868B] hidden sm:inline">
            Logged in: <strong>{userProfile?.email}</strong>
          </span>
        </div>
      </div>

      {/* Live Firestore Error Callout */}
      {liveError && (
        <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] text-xs text-[#DC2626] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>{liveError}</p>
        </div>
      )}

      {/* Statistical Overview (5 Canonical Metrics Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Reported */}
        <Card className="p-5 space-y-1">
          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
            Total Tickets
          </span>
          <p className="text-2xl font-bold text-[#1D1D1F]">
            {isLoadingLive ? <Loader2 className="w-5 h-5 animate-spin text-[#0071E3]" /> : metrics.totalReported}
          </p>
          <span className="text-[11px] text-[#656565]">Across all labs</span>
        </Card>

        {/* Pending Review */}
        <Card className="p-5 space-y-1">
          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
            Pending Review
          </span>
          <p className="text-2xl font-bold text-[#0071E3]">
            {isLoadingLive ? <Loader2 className="w-5 h-5 animate-spin text-[#0071E3]" /> : metrics.pendingReview}
          </p>
          <span className="text-[11px] text-[#656565]">Reported & In Review</span>
        </Card>

        {/* In Progress */}
        <Card className="p-5 space-y-1">
          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
            In Progress
          </span>
          <p className="text-2xl font-bold text-[#D97706]">
            {isLoadingLive ? <Loader2 className="w-5 h-5 animate-spin text-[#0071E3]" /> : metrics.inProgress}
          </p>
          <span className="text-[11px] text-[#656565]">Assigned & Under Repair</span>
        </Card>

        {/* Resolved */}
        <Card className="p-5 space-y-1">
          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
            Resolved
          </span>
          <p className="text-2xl font-bold text-[#248A3D]">
            {isLoadingLive ? <Loader2 className="w-5 h-5 animate-spin text-[#0071E3]" /> : metrics.resolved}
          </p>
          <span className="text-[11px] text-[#656565]">Verified Operational</span>
        </Card>

        {/* Critical Urgency */}
        <Card className="p-5 space-y-1 col-span-2 lg:col-span-1">
          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
            Critical Severity
          </span>
          <p className="text-2xl font-bold text-[#DC2626]">
            {isLoadingLive ? <Loader2 className="w-5 h-5 animate-spin text-[#0071E3]" /> : metrics.criticalUrgency}
          </p>
          <span className="text-[11px] text-[#DC2626] font-medium">Critical Priority</span>
        </Card>
      </div>

      {/* Triage & Management Workspace */}
      <Card className="overflow-hidden">
        {/* Workspace Control Header */}
        <CardHeader className="bg-[#FAFAFC] border-b border-[#E5E5EA] p-5 sm:px-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#0071E3]" />
              <h2 className="text-base font-semibold text-[#1D1D1F]">
                Laboratory Fault Tickets Directory
              </h2>
              <span className="text-xs text-[#86868B]">
                ({filteredReports.length} {filteredReports.length === 1 ? "ticket" : "tickets"})
              </span>
            </div>

            {/* Omni-Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search equipment, tag, lab, tech..."
                className="w-full min-h-[40px] pl-9 pr-3.5 py-1.5 text-xs bg-white border border-[#E5E5EA] rounded-xl focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/15 text-[#1D1D1F] placeholder:text-[#86868B]"
              />
            </div>
          </div>

          {/* Filter Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#E5E5EA]/60">
            {/* Status Filter Tabs (All 6 Lifecycle Statuses) */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {ALL_STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setFilterStatus(tab.value)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer text-xs ${
                    filterStatus === tab.value
                      ? "bg-[#0071E3] text-white"
                      : "bg-[#F5F5F7] text-[#656565] hover:text-[#1D1D1F] hover:bg-[#E5E5EA]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Secondary Select Dropdowns (Priority & Laboratory derived dynamically) */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Priority Select */}
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                aria-label="Filter tickets by priority"
                className="min-h-[36px] px-3 py-1.5 bg-white border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/15 cursor-pointer font-medium"
              >
                {ALL_PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Lab Select (Derived dynamically from active dataset) */}
              <select
                value={filterLab}
                onChange={(e) => setFilterLab(e.target.value)}
                aria-label="Filter tickets by laboratory room"
                className="min-h-[36px] px-3 py-1.5 bg-white border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/15 cursor-pointer max-w-[220px] truncate font-medium"
              >
                <option value="all">All Campus Labs</option>
                {availableLabs.map((lab) => (
                  <option key={lab} value={lab}>
                    {lab}
                  </option>
                ))}
              </select>

              {/* Reset Filters */}
              {(searchQuery || filterStatus !== "all" || filterPriority !== "all" || filterLab !== "all") && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="min-h-[36px] px-2.5 py-1.5 text-xs text-[#86868B] hover:text-[#DC2626] rounded-xl hover:bg-white transition-colors flex items-center gap-1 cursor-pointer"
                  title="Reset all filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Tickets Feed Content */}
        <CardContent className="p-0">
          {isLoadingLive ? (
            <div className="p-12 text-center text-xs text-[#86868B] flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#0071E3]" />
              <p>Synchronizing laboratory tickets from Firestore...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#86868B] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F5F7] text-[#86868B] flex items-center justify-center mx-auto">
                <Filter className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-sm text-[#1D1D1F]">No Matching Tickets Found</h3>
                <p className="max-w-md mx-auto text-[#656565]">
                  No tickets match your active filter criteria. Try adjusting your search query, status tabs, or lab selector.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className={buttonStyles({ variant: "outline", size: "sm" })}
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E5EA]">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="p-5 sm:p-6 hover:bg-[#FAFAFC]/70 transition-colors space-y-4"
                >
                  {/* Row Top Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] flex items-center justify-center text-[#0071E3] shrink-0 mt-0.5">
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-[#1D1D1F] truncate">
                            {report.equipmentName}
                          </h3>
                          <span className="text-xs font-mono text-[#86868B] px-1.5 py-0.5 rounded-md bg-[#F5F5F7] border border-[#E5E5EA]">
                            #{report.assetId}
                          </span>
                        </div>
                        <p className="text-xs text-[#656565]">
                          {report.labName} &bull; Reported by <strong>{report.reportedBy.name}</strong> ({report.reportedBy.email})
                        </p>
                      </div>
                    </div>

                    {/* Status & Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getPriorityVariant(report.priority)} size="sm">
                        {report.priority} Priority
                      </Badge>
                      <Badge variant={getStatusVariant(report.status)} size="sm">
                        {report.status}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleOpenTriage(report)}
                        className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer ml-1"
                      >
                        <Wrench className="w-3.5 h-3.5" /> Triage Ticket
                      </button>
                    </div>
                  </div>

                  {/* Symptom Description */}
                  <p className="text-xs text-[#1D1D1F] bg-[#F5F5F7] p-3 rounded-xl border border-[#E5E5EA] leading-relaxed whitespace-pre-wrap">
                    {report.description}
                  </p>

                  {/* AI Advisory Footnote & Technician Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                    {report.aiAnalysis ? (
                      <div className="flex items-start gap-2 text-[#0071E3] bg-[#EBF5FF] p-2.5 rounded-xl border border-[#B9E1FF]/60">
                        <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <div className="space-y-0.5 min-w-0">
                          <span className="font-semibold block text-[11px] uppercase tracking-wider">
                            Groq AI Advisory Suggestion
                          </span>
                          <p className="leading-snug text-[#1D1D1F] truncate">
                            {report.aiAnalysis.possibleRootCause}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[#86868B] bg-[#F5F5F7] p-2.5 rounded-xl border border-[#E5E5EA]">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>Awaiting technician initial bench inspection</span>
                      </div>
                    )}

                    {/* Assigned Technician & Notes */}
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-[#E5E5EA] bg-white text-[#656565]">
                      <span className="flex items-center gap-1.5 truncate">
                        <UserCheck className="w-3.5 h-3.5 text-[#0071E3] shrink-0" />
                        Technician:{" "}
                        <strong className="text-[#1D1D1F] truncate">
                          {report.assignedTechnician || "Unassigned"}
                        </strong>
                      </span>
                      <span className="text-[11px] text-[#86868B] shrink-0">
                        {report.adminNotes ? (
                          <span className="text-[#0071E3] font-medium">Notes attached</span>
                        ) : (
                          "No notes"
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Triage & Action Modal */}
      <AdminTriageModal
        report={selectedReport}
        isOpen={isTriageOpen}
        onClose={() => {
          setIsTriageOpen(false);
          setSelectedReport(null);
        }}
        onSaveTriage={handleSaveTriage}
        onDeleteReport={handleDeleteReport}
        isSimulated={!isLiveAdmin}
      />
    </div>
  );
}
