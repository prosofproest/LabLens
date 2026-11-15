"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useDemo, DEMO_USER_PROFILE } from "@/context/DemoContext";
import { FaultReport } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonStyles } from "@/components/ui/Button";
import { ReportCard } from "@/components/reports/ReportCard";
import { ReportDetailModal } from "@/components/reports/ReportDetailModal";
import {
  User,
  Building2,
  Mail,
  PlusCircle,
  ClipboardList,
  Wrench,
  CheckCircle2,
  Info,
} from "lucide-react";

export default function UserDemoPage() {
  const { userReports } = useDemo();
  const [selectedReport, setSelectedReport] = useState<FaultReport | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "resolved">("all");

  // Derived user statistics
  const totalCount = userReports.length;
  const inRepairCount = userReports.filter(
    (r) =>
      r.status === "In-Progress" ||
      r.status === "Assigned" ||
      r.status === "In-Review" ||
      r.status === "Reported"
  ).length;
  const resolvedCount = userReports.filter((r) => r.status === "Resolved").length;

  // Filtered reports
  const filteredReports = useMemo(() => {
    if (statusFilter === "active") {
      return userReports.filter((r) => r.status !== "Resolved" && r.status !== "Cancelled");
    }
    if (statusFilter === "resolved") {
      return userReports.filter((r) => r.status === "Resolved");
    }
    return userReports;
  }, [userReports, statusFilter]);

  return (
    <div className="space-y-8">
      {/* Header Profile Section */}
      <div className="bg-white rounded-3xl border border-[#E5E5EA] p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EBF5FF] text-[#0071E3] flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
            <User className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">
                {DEMO_USER_PROFILE.name}
              </h1>
              <Badge variant="info" size="sm">
                Student Demo
              </Badge>
              <Badge variant="neutral" size="sm">
                Simulated Session
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#656565]">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#86868B]" />
                {DEMO_USER_PROFILE.department}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#86868B]" />
                {DEMO_USER_PROFILE.email}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Link
            href="/demo/report"
            className={buttonStyles({
              variant: "primary",
              size: "md",
              className: "w-full sm:w-auto justify-center min-h-[44px]",
            })}
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Report Fault (Demo)
          </Link>
        </div>
      </div>

      {/* Demonstration Context Callout */}
      <div className="rounded-2xl border border-[#B9E1FF] bg-[#F5F9FF] p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#0071E3] shrink-0 mt-0.5" />
        <div className="text-xs text-[#1D1D1F] space-y-1">
          <p className="font-semibold text-[#0071E3]">
            Interactive Student & Faculty Demonstration Portal
          </p>
          <p className="text-[#656565] leading-relaxed">
            This dashboard simulates an authenticated student portal. You can submit simulated tickets, view advisory AI diagnostic suggestions, and track ticket status updates. Use the role switcher in the banner above to switch to the <strong>Admin Demo</strong> to inspect and triage these tickets from the administrator perspective!
          </p>
        </div>
      </div>

      {/* Live Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-6 bg-white border-[#E5E5EA]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">
              Total Reported
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#F5F5F7] text-[#1D1D1F] flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-[#1D1D1F] mt-3">
            {totalCount}
          </p>
          <span className="text-xs text-[#656565] mt-1 block">
            Simulated campus tickets
          </span>
        </Card>

        <Card className="p-6 bg-white border-[#E5E5EA]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">
              In Triage & Repair
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-[#D97706] mt-3">
            {inRepairCount}
          </p>
          <span className="text-xs text-[#656565] mt-1 block">
            Under technician investigation
          </span>
        </Card>

        <Card className="p-6 bg-white border-[#E5E5EA]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">
              Resolved Faults
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-[#16A34A] mt-3">
            {resolvedCount}
          </p>
          <span className="text-xs text-[#656565] mt-1 block">
            Certified operational equipment
          </span>
        </Card>
      </div>

      {/* Ticket History Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#1D1D1F]">
              Reported Equipment History
            </h2>
            <p className="text-xs text-[#656565]">
              Select any ticket to review equipment specifications, user notes, and AI triage advisory suggestions.
            </p>
          </div>

          {/* Status Filter Tabs */}
          <div className="inline-flex items-center p-1 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white text-[#1D1D1F] shadow-xs font-semibold"
                  : "text-[#656565] hover:text-[#1D1D1F]"
              }`}
            >
              All ({userReports.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                statusFilter === "active"
                  ? "bg-white text-[#1D1D1F] shadow-xs font-semibold"
                  : "text-[#656565] hover:text-[#1D1D1F]"
              }`}
            >
              Active ({inRepairCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("resolved")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                statusFilter === "resolved"
                  ? "bg-white text-[#1D1D1F] shadow-xs font-semibold"
                  : "text-[#656565] hover:text-[#1D1D1F]"
              }`}
            >
              Resolved ({resolvedCount})
            </button>
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#E5E5EA] p-12 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[#F5F5F7] text-[#86868B] mx-auto flex items-center justify-center">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-[#1D1D1F]">
                No Tickets in this Category
              </h3>
              <p className="text-xs text-[#656565] max-w-sm mx-auto">
                Submit a new simulated equipment fault to see it appear in this list.
              </p>
            </div>
            <Link
              href="/demo/report"
              className={buttonStyles({ variant: "outline", size: "sm" })}
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Report Equipment Fault
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {filteredReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onSelect={(r) => setSelectedReport(r)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Ticket Detail Modal */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
}
