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
  fetchNextReportsPage,
  getGlobalAdminMetrics,
  GlobalAdminMetrics,
  updateReportAdminTriage,
  deleteReportAdmin,
  AdminTriageInput,
} from "@/lib/firebase/reports";
import { subscribeAuditLogs } from "@/lib/firebase/audit";
import { FaultReport, ReportStatus, ReportPriority, AuditLogRecord, AuditActionType } from "@/types";
import { AdminTriageModal } from "@/components/admin/AdminTriageModal";
import { QueryDocumentSnapshot } from "firebase/firestore";
import {
  ShieldCheck,
  Filter,
  AlertTriangle,
  AlertCircle,
  UserCheck,
  ArrowLeft,
  Search,
  Clock,
  Wrench,
  Loader2,
  RotateCcw,
  History,
  ChevronDown,
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

const AUDIT_ACTION_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All Administrative Actions" },
  { value: "STATUS_CHANGE", label: "Status Changes" },
  { value: "PRIORITY_OVERRIDE", label: "Priority Overrides" },
  { value: "CATEGORY_OVERRIDE", label: "Category Overrides" },
  { value: "TECHNICIAN_ASSIGNMENT", label: "Technician Assignments" },
  { value: "TECHNICIAN_REMOVAL", label: "Technician Removals" },
  { value: "ADMIN_NOTE_CHANGE", label: "Admin Note Changes" },
  { value: "REPORT_DELETED", label: "Ticket Deletions" },
];

const INITIAL_SIMULATED_LOGS: AuditLogRecord[] = [
  {
    id: "sim-log-1",
    action: "STATUS_CHANGE",
    reportId: "mock-rep-1",
    equipmentName: "Workstation Dell Precision 3660",
    assetId: "CS-LAB3-WS04",
    performedBy: {
      uid: "simulated_admin",
      name: "Demonstration Admin",
      email: "admin@college.edu",
      role: "admin",
    },
    changes: [
      { field: "status", previousValue: "Reported", newValue: "In-Progress" },
    ],
    timestamp: "2026-11-15T15:00:00.000Z",
  },
];

export default function AdminDashboardPage() {
  const { user, userProfile, actualRole, activeRoleView, setActiveRoleView } = useAuth();

  // Strict authorization vs. preview separation:
  const isLiveAdmin = actualRole === "admin" && activeRoleView === "admin";
  const isPreview = !isLiveAdmin && activeRoleView === "admin";
  const isAuthorized = isLiveAdmin || isPreview;

  // Active Workspace Tab: "tickets" vs "audit"
  const [activeTab, setActiveTab] = useState<"tickets" | "audit">("tickets");

  // Live Admin data state (windowed newest 25)
  const [liveReports, setLiveReports] = useState<FaultReport[]>([]);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(true);
  const [liveError, setLiveError] = useState<string | null>(null);

  // Global Institutional Metrics (via getCountFromServer)
  const [globalMetrics, setGlobalMetrics] = useState<GlobalAdminMetrics | null>(null);

  // Synchronous loading status
  const isDataLoading = isLiveAdmin && isLoadingLive;

  // Role Preview local data state
  const [mockReports, setMockReports] = useState<FaultReport[]>(MOCK_ADMIN_REPORTS);

  // Audit Logs state
  const [liveAuditLogs, setLiveAuditLogs] = useState<AuditLogRecord[]>([]);
  const [simulatedAuditLogs, setSimulatedAuditLogs] = useState<AuditLogRecord[]>(INITIAL_SIMULATED_LOGS);
  const [auditActionFilter, setAuditActionFilter] = useState<string>("all");
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>("");

  // Search & Filter State for Tickets
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterLab, setFilterLab] = useState<string>("all");

  // Triage Modal State
  const [selectedReport, setSelectedReport] = useState<FaultReport | null>(null);
  const [isTriageOpen, setIsTriageOpen] = useState(false);

  // 1. Fetch Global Metrics across the entire collection via getCountFromServer
  const refreshMetrics = useCallback(async () => {
    if (!isLiveAdmin) return;
    try {
      const stats = await getGlobalAdminMetrics();
      setGlobalMetrics(stats);
    } catch (err) {
      console.error("Failed to fetch global institutional metrics:", err);
    }
  }, [isLiveAdmin]);

  // 2. Live Firestore Subscriptions (Only for authenticated administrators)
  useEffect(() => {
    if (!isLiveAdmin) return;

    // Windowed newest 25 reports subscription
    const unsubscribeReports = subscribeAllReports(
      (reports, lastSnap) => {
        setLiveReports(reports);
        if (lastSnap) setLastVisibleDoc(lastSnap);
        setHasMore(reports.length === 25);
        setIsLoadingLive(false);
        setLiveError(null);
      },
      (err) => {
        console.error("Admin live reports listener error:", err);
        setLiveError("Failed to synchronize live reports from Firestore.");
        setIsLoadingLive(false);
      },
      25
    );

    // Real-time Audit Logs subscription
    const unsubscribeAudit = subscribeAuditLogs(
      50,
      (logs) => {
        setLiveAuditLogs(logs);
      },
      (err) => {
        console.error("Admin audit logs listener error:", err);
      }
    );

    let isCancelled = false;
    getGlobalAdminMetrics()
      .then((stats) => {
        if (!isCancelled) setGlobalMetrics(stats);
      })
      .catch((err) => {
        console.error("Failed to fetch global institutional metrics:", err);
      });

    return () => {
      isCancelled = true;
      unsubscribeReports();
      unsubscribeAudit();
    };
  }, [isLiveAdmin]);

  // 3. Cursor-Based Pagination for older records
  const handleLoadMore = async () => {
    if (!lastVisibleDoc || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await fetchNextReportsPage(lastVisibleDoc, 25, filterStatus, filterLab);
      setLiveReports((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        const newReports = result.reports.filter((r) => !existingIds.has(r.id));
        return [...prev, ...newReports];
      });
      setLastVisibleDoc(result.lastVisibleSnapshot);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error("Error loading next page:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // 4. Derive active reports dataset
  const activeReports = useMemo(() => {
    return isLiveAdmin ? liveReports : mockReports;
  }, [isLiveAdmin, liveReports, mockReports]);

  // 5. Derive active audit logs dataset
  const activeAuditLogs = useMemo(() => {
    return isLiveAdmin ? liveAuditLogs : simulatedAuditLogs;
  }, [isLiveAdmin, liveAuditLogs, simulatedAuditLogs]);

  // 6. Derive lab filter options dynamically from active dataset
  const availableLabs = useMemo(() => {
    const labs = new Set<string>();
    for (const r of activeReports) {
      if (r.labName && r.labName.trim()) {
        labs.add(r.labName.trim());
      }
    }
    return Array.from(labs).sort();
  }, [activeReports]);

  // 7. Accurate Metrics: Global institutional counts in live mode, derived in preview
  const metrics = useMemo(() => {
    if (isLiveAdmin && globalMetrics) {
      return globalMetrics;
    }
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
  }, [isLiveAdmin, globalMetrics, activeReports]);

  // 8. Filter & Search execution for Tickets
  const filteredReports = useMemo(() => {
    return activeReports.filter((report) => {
      if (filterStatus !== "all" && report.status !== filterStatus) return false;
      if (filterPriority !== "all" && report.priority !== filterPriority) return false;
      if (filterLab !== "all" && report.labName !== filterLab) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesEquipment = report.equipmentName.toLowerCase().includes(q);
        const matchesAsset = report.assetId.toLowerCase().includes(q);
        const matchesLab = report.labName.toLowerCase().includes(q);
        const matchesReporter =
          report.reportedBy.name.toLowerCase().includes(q) ||
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

  // 9. Filter & Search execution for Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return activeAuditLogs.filter((log) => {
      if (auditActionFilter !== "all" && log.action !== auditActionFilter) return false;

      if (auditSearchQuery.trim()) {
        const q = auditSearchQuery.toLowerCase().trim();
        const matchesReport = log.reportId.toLowerCase().includes(q);
        const matchesAsset = log.assetId.toLowerCase().includes(q);
        const matchesEquipment = log.equipmentName.toLowerCase().includes(q);
        const matchesAdmin =
          log.performedBy.name.toLowerCase().includes(q) ||
          log.performedBy.email.toLowerCase().includes(q);

        if (!matchesReport && !matchesAsset && !matchesEquipment && !matchesAdmin) {
          return false;
        }
      }

      return true;
    });
  }, [activeAuditLogs, auditActionFilter, auditSearchQuery]);

  // 10. Administrative Actions: Live Atomic Triage vs. Simulated
  const handleSaveTriage = useCallback(
    async (reportId: string, update: AdminTriageInput) => {
      if (isLiveAdmin) {
        const adminActor = user
          ? {
              uid: user.uid,
              name: userProfile?.name || "Administrator",
              email: userProfile?.email || user.email || "",
            }
          : undefined;

        await updateReportAdminTriage(reportId, update, adminActor);
        refreshMetrics();
      } else {
        // Simulated local update with simulated audit record
        setMockReports((prev) =>
          prev.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  status: update.status,
                  priority: update.priority,
                  category: update.category,
                  assignedTechnician: update.assignedTechnician || null,
                  assignedAt: update.assignedAt ?? null,
                  adminNotes: update.adminNotes || null,
                  updatedAt: new Date().toISOString(),
                }
              : r
          )
        );

        setSimulatedAuditLogs((prev) => [
          {
            id: `sim-log-${Date.now()}`,
            action: "STATUS_CHANGE",
            reportId,
            equipmentName: selectedReport?.equipmentName || "Equipment",
            assetId: selectedReport?.assetId || "ASSET",
            performedBy: {
              uid: "simulated_admin",
              name: "Demonstration Admin",
              email: userProfile?.email || "admin@college.edu",
              role: "admin",
            },
            changes: [
              { field: "status", previousValue: selectedReport?.status, newValue: update.status },
              { field: "priority", previousValue: selectedReport?.priority, newValue: update.priority },
            ],
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    },
    [isLiveAdmin, user, userProfile, refreshMetrics, selectedReport]
  );

  const handleDeleteReport = useCallback(
    async (reportId: string) => {
      if (isLiveAdmin) {
        const adminActor = user
          ? {
              uid: user.uid,
              name: userProfile?.name || "Administrator",
              email: userProfile?.email || user.email || "",
            }
          : undefined;

        await deleteReportAdmin(reportId, adminActor);
        refreshMetrics();
      } else {
        setMockReports((prev) => prev.filter((r) => r.id !== reportId));
        setSimulatedAuditLogs((prev) => [
          {
            id: `sim-log-${Date.now()}`,
            action: "REPORT_DELETED",
            reportId,
            equipmentName: selectedReport?.equipmentName || "Equipment",
            assetId: selectedReport?.assetId || "ASSET",
            performedBy: {
              uid: "simulated_admin",
              name: "Demonstration Admin",
              email: userProfile?.email || "admin@college.edu",
              role: "admin",
            },
            changes: [
              { field: "status", previousValue: selectedReport?.status, newValue: "DELETED" },
            ],
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    },
    [isLiveAdmin, user, userProfile, refreshMetrics, selectedReport]
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

  const getAuditActionVariant = (action: AuditActionType) => {
    switch (action) {
      case "REPORT_DELETED":
        return "critical";
      case "PRIORITY_OVERRIDE":
        return "warning";
      case "STATUS_CHANGE":
        return "info";
      case "TECHNICIAN_ASSIGNMENT":
        return "success";
      case "TECHNICIAN_REMOVAL":
        return "warning";
      case "CATEGORY_OVERRIDE":
      case "ADMIN_NOTE_CHANGE":
      default:
        return "neutral";
    }
  };

  // Unauthorized guard
  if (!isAuthorized) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-8 text-center max-w-lg mx-auto shadow-xs space-y-4 my-12">
        <div className="w-12 h-12 rounded-2xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-[#1D1D1F]">
          Administrative Privileges Required
        </h2>
        <p className="text-xs text-[#656565] leading-relaxed">
          Access to campus laboratory management and live ticket triage is strictly restricted to verified departmental administrators.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
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
              <strong>Admin Role Preview Active:</strong> Demonstrating administrative triage and audit logging using local demonstration data. Real administrative Firestore queries and writes are completely disabled.
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
            Centralized laboratory triage, technician dispatches, and immutable audit logging across campus engineering facilities.
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

      {/* Statistical Overview (5 Canonical Metrics Cards - Global Counts) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-5 space-y-1">
          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
            Total Tickets
          </span>
          <p className="text-2xl font-bold text-[#1D1D1F]">
            {isDataLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#0071E3]" /> : metrics.totalReported}
          </p>
          <span className="text-[11px] text-[#656565]">Global institutional count</span>
        </Card>

        <Card className="p-5 space-y-1">
          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
            Pending Review
          </span>
          <p className="text-2xl font-bold text-[#0071E3]">
            {isDataLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#0071E3]" /> : metrics.pendingReview}
          </p>
          <span className="text-[11px] text-[#656565]">Reported & In Review</span>
        </Card>

        <Card className="p-5 space-y-1">
          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
            In Progress
          </span>
          <p className="text-2xl font-bold text-[#D97706]">
            {isDataLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#0071E3]" /> : metrics.inProgress}
          </p>
          <span className="text-[11px] text-[#656565]">Assigned & Under Repair</span>
        </Card>

        <Card className="p-5 space-y-1">
          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
            Resolved
          </span>
          <p className="text-2xl font-bold text-[#248A3D]">
            {isDataLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#0071E3]" /> : metrics.resolved}
          </p>
          <span className="text-[11px] text-[#656565]">Verified Operational</span>
        </Card>

        <Card className="p-5 space-y-1 col-span-2 lg:col-span-1">
          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
            Critical Severity
          </span>
          <p className="text-2xl font-bold text-[#DC2626]">
            {isDataLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#0071E3]" /> : metrics.criticalUrgency}
          </p>
          <span className="text-[11px] text-[#DC2626] font-medium">Critical Priority</span>
        </Card>
      </div>

      {/* Main Administrative Workspace */}
      <Card className="overflow-hidden">
        {/* Workspace Tab Switcher (Tickets Feed vs Audit Logs) */}
        <div className="flex items-center gap-4 border-b border-[#E5E5EA] px-6 pt-3 bg-[#FAFAFC]">
          <button
            type="button"
            onClick={() => setActiveTab("tickets")}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === "tickets"
                ? "border-[#0071E3] text-[#0071E3]"
                : "border-transparent text-[#86868B] hover:text-[#1D1D1F]"
            }`}
          >
            <Filter className="w-4 h-4" />
            Tickets Directory ({filteredReports.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === "audit"
                ? "border-[#0071E3] text-[#0071E3]"
                : "border-transparent text-[#86868B] hover:text-[#1D1D1F]"
            }`}
          >
            <History className="w-4 h-4" />
            Audit Trail ({filteredAuditLogs.length})
          </button>
        </div>

        {activeTab === "tickets" ? (
          <>
            {/* Tickets Filters Header */}
            <CardHeader className="bg-[#FAFAFC] border-b border-[#E5E5EA] p-5 sm:px-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-[#1D1D1F]">
                    Laboratory Fault Tickets Directory
                  </h2>
                  <span className="text-xs text-[#86868B]">
                    (Showing {filteredReports.length} {filteredReports.length === 1 ? "ticket" : "tickets"})
                  </span>
                </div>

                {/* Omni-Search Input */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search equipment, asset ID, lab..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5E5EA] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#86868B] hover:text-[#1D1D1F]"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#E5E5EA]/60">
                {ALL_STATUS_TABS.map((tab) => {
                  const isSelected = filterStatus === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setFilterStatus(tab.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer min-h-[36px] flex items-center ${
                        isSelected
                          ? "bg-[#0071E3] text-white shadow-xs"
                          : "bg-white text-[#656565] border border-[#E5E5EA] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Secondary Filters Bar: Priority, Lab */}
              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
                {/* Priority Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[#86868B] font-medium">Priority:</span>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-[#E5E5EA] bg-white text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                  >
                    {ALL_PRIORITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Laboratory Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[#86868B] font-medium">Lab:</span>
                  <select
                    value={filterLab}
                    onChange={(e) => setFilterLab(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-[#E5E5EA] bg-white text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] max-w-[200px] truncate"
                  >
                    <option value="all">All Campus Laboratories</option>
                    {availableLabs.map((lab) => (
                      <option key={lab} value={lab}>
                        {lab}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reset Filters Shortcut */}
                {(searchQuery || filterStatus !== "all" || filterPriority !== "all" || filterLab !== "all") && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="flex items-center gap-1 text-xs text-[#0071E3] hover:underline cursor-pointer ml-auto"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset Filters
                  </button>
                )}
              </div>
            </CardHeader>

            {/* Tickets Content Feed */}
            <CardContent className="p-6">
              {isDataLoading ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0071E3] mx-auto" />
                  <p className="text-xs text-[#656565]">Synchronizing tickets from Firestore...</p>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <p className="text-sm font-semibold text-[#1D1D1F]">No laboratory tickets match your criteria</p>
                  <p className="text-xs text-[#656565]">Try adjusting your search query, status, or laboratory filter.</p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className={buttonStyles({ variant: "outline", size: "sm" })}
                  >
                    Clear Filter Parameters
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {filteredReports.map((report) => (
                      <div
                        key={report.id}
                        className="p-5 rounded-2xl border border-[#E5E5EA] bg-white hover:border-[#B9E1FF] transition-all shadow-xs space-y-4"
                      >
                        {/* Ticket Header & Badges */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-[#0071E3] bg-[#EBF5FF] px-2 py-0.5 rounded-md">
                                {report.assetId}
                              </span>
                              <h3 className="font-semibold text-sm text-[#1D1D1F]">{report.equipmentName}</h3>
                              {report.category && (
                                <Badge variant="neutral" size="sm">
                                  {report.category}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-[#656565]">
                              {report.labName} &bull; Reported by {report.reportedBy.name} ({report.reportedBy.department || "Engineering"}) &bull; {new Date(report.createdAt).toLocaleDateString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <Badge variant={getPriorityVariant(report.priority)} size="sm">
                              {report.priority}
                            </Badge>
                            <Badge variant={getStatusVariant(report.status)} size="sm">
                              {report.status}
                            </Badge>
                            <button
                              type="button"
                              onClick={() => handleOpenTriage(report)}
                              className={buttonStyles({ variant: "primary", size: "sm" })}
                            >
                              <Wrench className="w-3.5 h-3.5 mr-1" />
                              Triage Ticket
                            </button>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-[#1D1D1F] bg-[#F5F5F7] p-3 rounded-xl border border-[#E5E5EA]/60 leading-relaxed">
                          {report.description}
                        </p>

                        {/* AI Summary and Technician Metadata */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {report.aiAnalysis ? (
                            <div className="p-2.5 rounded-xl bg-[#F5F9FF] border border-[#B9E1FF] text-[#0071E3] flex items-start gap-2">
                              <span className="font-semibold shrink-0">Groq AI:</span>
                              <p className="leading-snug text-[#1D1D1F] truncate">
                                {report.aiAnalysis.possibleRootCause}
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[#86868B] bg-[#F5F5F7] p-2.5 rounded-xl border border-[#E5E5EA]">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>Awaiting technician initial bench inspection</span>
                            </div>
                          )}

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

                  {/* Cursor-Based Pagination "Load More Tickets" Button */}
                  {isLiveAdmin && hasMore && (
                    <div className="pt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className={buttonStyles({ variant: "outline", size: "md" })}
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Loading older tickets...
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4 mr-2" />
                            Load More Tickets (Cursor Pagination)
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </>
        ) : (
          /* ========================================================================= */
          /* AUDIT TRAIL VIEW (Immutable Administrative Action Records)                */
          /* ========================================================================= */
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5EA]">
              <div>
                <h3 className="text-base font-semibold text-[#1D1D1F] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0071E3]" />
                  Administrative Audit Trail
                </h3>
                <p className="text-xs text-[#656565]">
                  Append-only immutable record of all administrative status overrides, technician assignments, and ticket deletions.
                </p>
              </div>

              {/* Action Filters & Search */}
              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#E5E5EA] bg-white text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                >
                  {AUDIT_ACTION_FILTERS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  placeholder="Filter by asset or admin..."
                  className="px-3 py-1.5 rounded-xl border border-[#E5E5EA] bg-white text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] w-48"
                />
              </div>
            </div>

            {filteredAuditLogs.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-sm font-semibold text-[#1D1D1F]">No audit log records found</p>
                <p className="text-xs text-[#656565]">
                  Administrative actions taken in this session will appear here with permanent timestamps.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl border border-[#E5E5EA] bg-white hover:border-[#B9E1FF] transition-all text-xs space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getAuditActionVariant(log.action)} size="sm">
                          {log.action}
                        </Badge>
                        <span className="font-mono font-bold text-[#0071E3]">
                          Ticket #{log.assetId}
                        </span>
                        <span className="text-[#656565]">&bull;</span>
                        <span className="font-medium text-[#1D1D1F] truncate max-w-xs">
                          {log.equipmentName}
                        </span>
                      </div>

                      <span className="text-[11px] text-[#86868B] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#E5E5EA]/60 text-[11px]">
                      <span className="text-[#656565]">
                        Performed by:{" "}
                        <strong className="text-[#1D1D1F]">
                          {log.performedBy.name}
                        </strong>{" "}
                        ({log.performedBy.email})
                      </span>

                      {/* Changes Summary */}
                      <div className="flex flex-wrap items-center gap-2">
                        {log.changes.map((c, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 bg-[#F5F5F7] px-2 py-0.5 rounded border border-[#E5E5EA]"
                          >
                            <span className="font-semibold text-[#1D1D1F]">{c.field}:</span>{" "}
                            <span className="line-through text-[#86868B]">{String(c.previousValue ?? "none")}</span>{" "}
                            &rarr;{" "}
                            <span className="font-medium text-[#0071E3]">{String(c.newValue ?? "none")}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
