"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useDemo } from "@/context/DemoContext";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonStyles } from "@/components/ui/Button";
import { FaultReport, ReportStatus, ReportPriority } from "@/types";
import { AdminTriageInput } from "@/lib/firebase/reports";
import { AdminTriageModal } from "@/components/admin/AdminTriageModal";
import {
  ShieldCheck,
  Filter,
  UserCheck,
  Search,
  Wrench,
  Info,
  Calendar,
  MapPin,
  User,
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

export default function AdminDemoPage() {
  const { reports, stats, updateDemoTriage, deleteDemoReport } = useDemo();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterLab, setFilterLab] = useState<string>("all");

  // Triage Modal State
  const [selectedReport, setSelectedReport] = useState<FaultReport | null>(null);
  const [isTriageOpen, setIsTriageOpen] = useState(false);

  // Derive unique laboratories dynamically from the active reports
  const labOptions = useMemo(() => {
    const labs = new Set<string>();
    for (const r of reports) {
      if (r.labName) labs.add(r.labName);
    }
    return Array.from(labs).sort();
  }, [reports]);

  // Comprehensive multi-factor filtering and search
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // 1. Status Filter
      if (filterStatus !== "all" && report.status !== filterStatus) {
        return false;
      }

      // 2. Priority Filter
      if (filterPriority !== "all" && report.priority !== filterPriority) {
        return false;
      }

      // 3. Laboratory Filter
      if (filterLab !== "all" && report.labName !== filterLab) {
        return false;
      }

      // 4. Omni-Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesEquipment = report.equipmentName.toLowerCase().includes(query);
        const matchesAsset = report.assetId.toLowerCase().includes(query);
        const matchesLab = report.labName.toLowerCase().includes(query);
        const matchesDesc = report.description.toLowerCase().includes(query);
        const matchesReporter = report.reportedBy?.name?.toLowerCase().includes(query);
        const matchesTech = report.assignedTechnician?.toLowerCase().includes(query);
        const matchesCategory = report.category?.toLowerCase().includes(query) ||
          report.aiAnalysis?.suggestedCategory?.toLowerCase().includes(query);

        if (
          !matchesEquipment &&
          !matchesAsset &&
          !matchesLab &&
          !matchesDesc &&
          !matchesReporter &&
          !matchesTech &&
          !matchesCategory
        ) {
          return false;
        }
      }

      return true;
    });
  }, [reports, filterStatus, filterPriority, filterLab, searchQuery]);

  // Open triage modal for a ticket
  const handleOpenTriage = (report: FaultReport) => {
    setSelectedReport(report);
    setIsTriageOpen(true);
  };

  // Close triage modal
  const handleCloseTriage = () => {
    setIsTriageOpen(false);
    setSelectedReport(null);
  };

  // Execute in-memory triage save
  const handleSaveTriage = async (reportId: string, update: AdminTriageInput) => {
    updateDemoTriage(reportId, update);
    handleCloseTriage();
  };

  // Execute in-memory deletion
  const handleDeleteReport = async (reportId: string) => {
    deleteDemoReport(reportId);
    handleCloseTriage();
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

  return (
    <div className="space-y-8">
      {/* Admin Command Header */}
      <div className="bg-white rounded-3xl border border-[#E5E5EA] p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center font-bold text-xl shadow-xs border border-[#BBF7D0] shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">
                Administrator Operations Command Center
              </h1>
              <Badge variant="success" size="sm">
                Admin Demo
              </Badge>
              <Badge variant="neutral" size="sm">
                Simulated Privileges
              </Badge>
            </div>
            <p className="text-xs text-[#656565]">
              Campus Technical Services & Laboratory Maintenance Operations &bull; Isolated In-Memory Simulation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/demo"
            className={buttonStyles({
              variant: "outline",
              size: "sm",
              className: "min-h-[40px]",
            })}
          >
            <User className="w-4 h-4 mr-1.5 text-[#0071E3]" />
            Switch to User Demo
          </Link>
        </div>
      </div>

      {/* Demonstration Context Callout */}
      <div className="rounded-2xl border border-[#B9E1FF] bg-[#F5F9FF] p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#0071E3] shrink-0 mt-0.5" />
        <div className="text-xs text-[#1D1D1F] space-y-1">
          <p className="font-semibold text-[#0071E3]">
            Interactive Administrative Demonstration Mode
          </p>
          <p className="text-[#656565] leading-relaxed">
            You are viewing the administrative hub with simulated administrative privileges. You can browse tickets across all campus laboratories, execute operational triage (status updates, technician assignments, category & priority overrides), and delete cancelled tickets. All changes update local in-memory state and do not touch Firestore.
          </p>
        </div>
      </div>

      {/* 5 Administrative Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="p-5 bg-white border-[#E5E5EA]">
          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block">
            Total Tickets
          </span>
          <p suppressHydrationWarning className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F] mt-2">
            {stats.totalReported}
          </p>
          <span className="text-[11px] text-[#656565] mt-1 block">Active dataset</span>
        </Card>

        <Card className="p-5 bg-white border-[#E5E5EA]">
          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block">
            Pending Review
          </span>
          <p suppressHydrationWarning className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0071E3] mt-2">
            {stats.pendingReview}
          </p>
          <span className="text-[11px] text-[#656565] mt-1 block">Awaiting triage</span>
        </Card>

        <Card className="p-5 bg-white border-[#E5E5EA]">
          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block">
            In Progress
          </span>
          <p suppressHydrationWarning className="text-2xl sm:text-3xl font-bold tracking-tight text-[#D97706] mt-2">
            {stats.inProgress}
          </p>
          <span className="text-[11px] text-[#656565] mt-1 block">Assigned / In repair</span>
        </Card>

        <Card className="p-5 bg-white border-[#E5E5EA]">
          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block">
            Resolved
          </span>
          <p suppressHydrationWarning className="text-2xl sm:text-3xl font-bold tracking-tight text-[#16A34A] mt-2">
            {stats.resolved}
          </p>
          <span className="text-[11px] text-[#656565] mt-1 block">Operational units</span>
        </Card>

        <Card className="p-5 bg-white border-[#E5E5EA] col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-[#DC2626] uppercase tracking-wider block">
            Critical Urgency
          </span>
          <p suppressHydrationWarning className="text-2xl sm:text-3xl font-bold tracking-tight text-[#DC2626] mt-2">
            {stats.criticalIssues}
          </p>
          <span className="text-[11px] text-[#DC2626] mt-1 block font-medium">Requires dispatch</span>
        </Card>
      </div>

      {/* Multi-Factor Search & Filter Controls */}
      <div className="bg-white rounded-3xl border border-[#E5E5EA] p-5 sm:p-6 shadow-xs space-y-4">
        {/* Omni-Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by equipment, asset ID (LAB-CS-042), lab room, technician, or keyword..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] text-sm text-[#1D1D1F] placeholder:text-[#86868B] focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#86868B] hover:text-[#1D1D1F] p-1 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {ALL_STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilterStatus(tab.value)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                filterStatus === tab.value
                  ? "bg-[#1D1D1F] text-white shadow-xs font-semibold"
                  : "bg-[#F5F5F7] text-[#656565] hover:text-[#1D1D1F] hover:bg-[#E5E5EA]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Priority & Lab Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-[#E5E5EA]/70">
          <div className="flex items-center gap-2 text-xs text-[#656565]">
            <Filter className="w-3.5 h-3.5 text-[#86868B]" />
            <span className="font-medium">Filter by:</span>
          </div>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[#F5F5F7] border border-[#E5E5EA] text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] cursor-pointer"
          >
            {ALL_PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={filterLab}
            onChange={(e) => setFilterLab(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[#F5F5F7] border border-[#E5E5EA] text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] cursor-pointer max-w-[260px] truncate"
          >
            <option value="all">All Campus Laboratories</option>
            {labOptions.map((lab) => (
              <option key={lab} value={lab}>
                {lab}
              </option>
            ))}
          </select>

          {(filterStatus !== "all" ||
            filterPriority !== "all" ||
            filterLab !== "all" ||
            searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setFilterStatus("all");
                setFilterPriority("all");
                setFilterLab("all");
                setSearchQuery("");
              }}
              className="text-xs text-[#0071E3] hover:underline cursor-pointer ml-auto"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* Ticket List Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-[#1D1D1F]">
          Laboratory Tickets ({filteredReports.length})
        </h2>
        <span className="text-xs text-[#86868B]">
          Showing {filteredReports.length} of {reports.length} total demo tickets
        </span>
      </div>

      {/* Ticket Cards Grid */}
      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#E5E5EA] p-12 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#F5F5F7] text-[#86868B] mx-auto flex items-center justify-center">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-[#1D1D1F]">
              No Tickets Match Your Filter Criteria
            </h3>
            <p className="text-xs text-[#656565] max-w-sm mx-auto">
              Try adjusting your search query, status tab, priority, or laboratory selection.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFilterStatus("all");
              setFilterPriority("all");
              setFilterLab("all");
              setSearchQuery("");
            }}
            className={buttonStyles({ variant: "outline", size: "sm" })}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-2xl border border-[#E5E5EA] p-5 sm:p-6 shadow-xs hover:border-[#0071E3]/40 transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                {/* Top Row: Equipment, ID, Badges */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-[#1D1D1F]">
                        {report.equipmentName}
                      </h3>
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-[#F5F5F7] text-[#656565] border border-[#E5E5EA]">
                        {report.assetId}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#656565]">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#86868B]" />
                        {report.labName}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-[#86868B]" />
                        Reported by {report.reportedBy?.name || "Student"}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#86868B]" />
                        {report.createdAt.split("T")[0]}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={getPriorityVariant(report.priority)} size="sm">
                      {report.priority}
                    </Badge>
                    <Badge variant={getStatusVariant(report.status)} size="sm">
                      {report.status}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-[#1D1D1F] line-clamp-2 leading-relaxed bg-[#F5F5F7] p-2.5 rounded-xl border border-[#E5E5EA]/70">
                  {report.description}
                </p>

                {/* AI & Operational Metadata Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E5E5EA]/70 text-xs">
                  <div className="flex flex-wrap items-center gap-3 text-[#656565]">
                    {report.category && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EBF5FF] text-[#0071E3] font-semibold text-[11px]">
                        Category: {report.category}
                      </span>
                    )}
                    {report.assignedTechnician ? (
                      <span className="flex items-center gap-1 font-medium text-[#1D1D1F]">
                        <UserCheck className="w-3.5 h-3.5 text-[#16A34A]" />
                        Assigned: {report.assignedTechnician}
                      </span>
                    ) : (
                      <span className="text-[#86868B] italic">
                        Unassigned technician
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenTriage(report)}
                    className={buttonStyles({
                      variant: "primary",
                      size: "sm",
                      className: "cursor-pointer min-h-[36px]",
                    })}
                  >
                    <Wrench className="w-3.5 h-3.5 mr-1.5" />
                    Triage Ticket
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Triage Modal */}
      {selectedReport && (
        <AdminTriageModal
          report={selectedReport}
          isOpen={isTriageOpen}
          onClose={handleCloseTriage}
          onSaveTriage={handleSaveTriage}
          onDeleteReport={handleDeleteReport}
          isSimulated={true}
        />
      )}
    </div>
  );
}
