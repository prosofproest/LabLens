"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonStyles } from "@/components/ui/Button";
import {
  User,
  Building2,
  Mail,
  PlusCircle,
  ClipboardList,
  Sparkles,
} from "lucide-react";

export default function UserDashboardPage() {
  const { userProfile, actualRole, setActiveRoleView } = useAuth();

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
            href="/#sample-report"
            className={buttonStyles({ variant: "primary", size: "sm" })}
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Report Fault (Demo View)
          </Link>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-6 space-y-2">
          <span className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">
            My Reported Faults
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-semibold text-[#1D1D1F]">0</span>
            <span className="text-xs text-[#86868B]">Active tickets</span>
          </div>
        </Card>

        <Card className="p-6 space-y-2">
          <span className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">
            In Repair / In-Progress
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-semibold text-[#D97706]">0</span>
            <span className="text-xs text-[#86868B]">Technician assigned</span>
          </div>
        </Card>

        <Card className="p-6 space-y-2">
          <span className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">
            Resolved Issues
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-semibold text-[#248A3D]">0</span>
            <span className="text-xs text-[#86868B]">Fully closed</span>
          </div>
        </Card>
      </div>

      {/* Tickets Section with Clean Phase 2 Empty State */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-[#E5E5EA] bg-[#FAFAFC] py-4 px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#0071E3]" />
            <h2 className="text-base font-semibold text-[#1D1D1F]">
              My Equipment Fault Tickets
            </h2>
          </div>
          <span className="text-xs text-[#86868B]">
            Showing tickets created by your account
          </span>
        </CardHeader>

        <CardContent className="p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] flex items-center justify-center text-[#86868B] mx-auto">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-medium text-[#1D1D1F]">
              No active fault reports
            </h3>
            <p className="text-xs text-[#656565] leading-relaxed">
              When laboratory equipment malfunctions, use the reporting portal to submit tickets and track technician assignments.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/#sample-report"
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              Explore Sample Report Workflow
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
