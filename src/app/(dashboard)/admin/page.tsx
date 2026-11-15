"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonStyles } from "@/components/ui/Button";
import { MOCK_ADMIN_STATS, MOCK_ADMIN_REPORTS } from "@/lib/mockAdminData";
import {
  ShieldCheck,
  Filter,
  Monitor,
  Sparkles,
  AlertTriangle,
  UserCheck,
  ArrowLeft,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { userProfile, actualRole, activeRoleView, isRoleSimulated, setActiveRoleView } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // If a standard user visits /admin without simulation mode enabled:
  const isAuthorized = actualRole === "admin" || isRoleSimulated || activeRoleView === "admin";

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
          Access to this area requires an administrative role. If you are demonstrating the platform, you can enable Admin Preview Mode.
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

  // Filter reports
  const filteredReports = filterStatus === "all"
    ? MOCK_ADMIN_REPORTS
    : MOCK_ADMIN_REPORTS.filter((r) => r.status.toLowerCase() === filterStatus.toLowerCase());

  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0071E3] flex items-center justify-center text-white">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#1D1D1F]">
              Administrative Operations Hub
            </h1>
            {actualRole === "admin" ? (
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
            Centralized laboratory triage, technician dispatches, and equipment status tracking across campus engineering facilities.
          </p>
        </div>

        {/* View Switcher / Action Callout */}
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

      {/* Admin Statistical Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-5 space-y-1">
          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
            Total Tickets
          </span>
          <p className="text-2xl font-bold text-[#1D1D1F]">
            {MOCK_ADMIN_STATS.totalReported}
          </p>
          <span className="text-[11px] text-[#656565]">Across all labs</span>
        </Card>

        <Card className="p-5 space-y-1">
          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
            Pending Review
          </span>
          <p className="text-2xl font-bold text-[#0071E3]">
            {MOCK_ADMIN_STATS.pendingReview}
          </p>
          <span className="text-[11px] text-[#656565]">Awaiting triage</span>
        </Card>

        <Card className="p-5 space-y-1">
          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
            In Progress
          </span>
          <p className="text-2xl font-bold text-[#D97706]">
            {MOCK_ADMIN_STATS.inProgress}
          </p>
          <span className="text-[11px] text-[#656565]">Under repair</span>
        </Card>

        <Card className="p-5 space-y-1">
          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
            Resolved
          </span>
          <p className="text-2xl font-bold text-[#248A3D]">
            {MOCK_ADMIN_STATS.resolved}
          </p>
          <span className="text-[11px] text-[#656565]">Verified operational</span>
        </Card>

        <Card className="p-5 space-y-1 col-span-2 lg:col-span-1">
          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
            Critical Severity
          </span>
          <p className="text-2xl font-bold text-[#DC2626]">
            {MOCK_ADMIN_STATS.criticalIssues}
          </p>
          <span className="text-[11px] text-[#DC2626] font-medium">Urgent attention</span>
        </Card>
      </div>

      {/* Tickets Table / List */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-[#FAFAFC] border-b border-[#E5E5EA] p-5 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#0071E3]" />
            <h2 className="text-base font-semibold text-[#1D1D1F]">
              Active Laboratory Fault Tickets
            </h2>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {["all", "reported", "assigned", "in-progress", "resolved"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer capitalize ${
                  filterStatus === st
                    ? "bg-[#0071E3] text-white"
                    : "bg-[#F5F5F7] text-[#656565] hover:text-[#1D1D1F]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-[#E5E5EA]">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="p-5 sm:p-6 hover:bg-[#FAFAFC]/60 transition-colors space-y-4"
              >
                {/* Row Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] flex items-center justify-center text-[#0071E3] shrink-0 mt-0.5">
                      <Monitor className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-[#1D1D1F]">
                          {report.equipmentName}
                        </h3>
                        <span className="text-xs font-mono text-[#86868B]">
                          #{report.assetId}
                        </span>
                      </div>
                      <p className="text-xs text-[#656565] mt-0.5">
                        {report.labName} &bull; Reported by <strong>{report.reportedBy.name}</strong> ({report.reportedBy.email})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        report.priority === "Critical"
                          ? "critical"
                          : report.priority === "High"
                          ? "warning"
                          : "neutral"
                      }
                      size="sm"
                    >
                      {report.priority} Priority
                    </Badge>
                    <Badge
                      variant={
                        report.status === "Resolved"
                          ? "success"
                          : report.status === "In-Progress"
                          ? "warning"
                          : "info"
                      }
                      size="sm"
                    >
                      {report.status}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-[#1D1D1F] bg-[#F5F5F7] p-3 rounded-xl border border-[#E5E5EA] leading-relaxed">
                  {report.description}
                </p>

                {/* AI Triage & Technician Footnote */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  {report.aiAnalysis && (
                    <div className="flex items-start gap-2 text-[#0071E3] bg-[#EBF5FF] p-2.5 rounded-lg border border-[#B9E1FF]/60">
                      <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">AI Triage Suggestion:</span>{" "}
                        <span>{report.aiAnalysis.possibleRootCause}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-[#E5E5EA] bg-white text-[#656565]">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-[#0071E3]" />
                      Technician:{" "}
                      <strong className="text-[#1D1D1F]">
                        {report.assignedTechnician || "Unassigned"}
                      </strong>
                    </span>
                    <span className="text-[11px] text-[#86868B]">
                      {report.adminNotes || "No notes"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
