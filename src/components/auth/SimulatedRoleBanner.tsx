"use client";

import React from "react";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { UserRole } from "@/types";

interface SimulatedRoleBannerProps {
  activeRoleView: UserRole;
  actualRole: UserRole;
  onReset: () => void;
}

export function SimulatedRoleBanner({
  activeRoleView,
  actualRole,
  onReset,
}: SimulatedRoleBannerProps) {
  return (
    <div className="bg-[#FEF3C7] border-b border-[#FDE68A] px-4 py-2 text-xs text-[#92400E]">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0" />
          <span>
            <strong>Role Preview Simulation:</strong> You are currently viewing the{" "}
            <span className="capitalize font-semibold underline">{activeRoleView}</span> interface using demonstration data. Your actual database role is <strong>{actualRole}</strong>.
          </span>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 font-semibold text-[#B45309] hover:text-[#78350F] underline cursor-pointer p-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Exit Preview
        </button>
      </div>
    </div>
  );
}

