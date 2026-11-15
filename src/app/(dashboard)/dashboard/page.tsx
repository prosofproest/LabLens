"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { subscribeUserReports } from "@/lib/firebase/reports";
import { FaultReport } from "@/types";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
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
  Sparkles,
  Loader2,
  Wrench,
  CheckCircle2,
} from "lucide-react";

export default function UserDashboardPage() {
  const { user, userProfile, actualRole, setActiveRoleView } = useAuth();
  const [reports, setReports] = useState<FaultReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedReport, setSelectedReport] = useState<FaultReport | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribe = subscribeUserReports(
      user.uid,
      (fetchedReports) => {
        setReports(fetchedReports);
        setLoadingReports(false);
      },
      (err) => {
        console.error("Dashboard reports subscription error:", err);
        setLoadingReports(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Derived live metrics
  const totalCount = reports.length;
  const inRepairCount = reports.filter(
    (r) =>
      r.status === "In-Progress" ||
      r.status === "Assigned" ||
      r.status === "In-Review"
  ).length;
  const resolvedCount = reports.filter((r) => r.status === "Resolved").length;

  return (
    <div className="space-y-8">
      {/* Header Profile Section */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EBF5FF] text-[#0071E3] flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
            <User className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-[#1D1D1F]">
                {userProfile?.name || "Student User"}
              </h1>
              <Badge variant={actualRole === "admin" ? "success" : "neutral"} size="sm">
                Role: {actualRole.toUpperCase()}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#656565]">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#86868B]" />
                {userProfile?.department || "Academic Department"}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#86868B]" />
                {userProfile?.email}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button & Demo Switcher Callout */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {actualRole === "user" && (
            <button
              type="button"
              onClick={() => setActiveRoleView("admin")}
              className={buttonStyles({ variant: "outline", size: "sm" })}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#0071E3] mr-1.5" />
              Preview Admin Dashboard
            </button>
          )}

          <Link
            href="/report"
            className={buttonStyles({ variant: "primary", size: "sm" })}
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Report Fault
          </Link>
        </div>
      </div>

      {/* Overview Metric Cards with Live Counts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">
              My Reported Faults
            </span>
            <ClipboardList className="w-4 h-4 text-[#0071E3]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-semibold text-[#1D1D1F]">{totalCount}</span>
            <span className="text-xs text-[#86868B]">Total tickets</span>
          </div>
        </Card>

        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">
              In Repair / In-Progress
            </span>
            <Wrench className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-semibold text-[#D97706]">{inRepairCount}</span>
            <span className="text-xs text-[#86868B]">Active repairs</span>
          </div>
        </Card>

        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">
              Resolved Issues
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#248A3D]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-semibold text-[#248A3D]">{resolvedCount}</span>
            <span className="text-xs text-[#86868B]">Fully closed</span>
          </div>
        </Card>
      </div>

      {/* Tickets Section with Live Firestore Data */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-[#E5E5EA] bg-[#FAFAFC] py-4 px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#0071E3]" />
            <h2 className="text-base font-semibold text-[#1D1D1F]">
              My Equipment Fault Tickets
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#86868B]">
              {totalCount} {totalCount === 1 ? "ticket" : "tickets"} registered
            </span>
            <Link
              href="/report"
              className="text-xs font-medium text-[#0071E3] hover:underline"
            >
              + New Report
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {loadingReports ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#86868B]">
              <Loader2 className="w-6 h-6 animate-spin text-[#0071E3]" />
              <p className="text-xs font-medium">Loading your fault reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] flex items-center justify-center text-[#86868B] mx-auto">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-base font-medium text-[#1D1D1F]">
                  No equipment faults reported yet
                </h3>
                <p className="text-xs text-[#656565] leading-relaxed">
                  When laboratory equipment malfunctions, submit a fault report with optional defect photos to trigger technician dispatch.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/report"
                  className={buttonStyles({ variant: "primary", size: "sm" })}
                >
                  <PlusCircle className="w-4 h-4 mr-1.5" />
                  Submit Your First Fault Report
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onSelect={(rep) => setSelectedReport(rep)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <ReportDetailModal
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
      />
    </div>
  );
}
