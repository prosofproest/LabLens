"use client";

import React from "react";
import { UserRole } from "@/types";
import { User, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface RolePreviewSelectorProps {
  activeRoleView: UserRole;
  actualRole: UserRole;
  onSelectRole: (role: UserRole) => void;
}

export function RolePreviewSelector({
  activeRoleView,
  actualRole,
  onSelectRole,
}: RolePreviewSelectorProps) {
  return (
    <div className="inline-flex items-center p-1 rounded-full bg-[#F5F5F7] border border-[#E5E5EA]">
      <button
        type="button"
        onClick={() => onSelectRole("user")}
        className={cn(
          "min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
          activeRoleView === "user"
            ? "bg-white text-[#1D1D1F] shadow-xs"
            : "text-[#656565] hover:text-[#1D1D1F]"
        )}
        aria-pressed={activeRoleView === "user"}
      >
        <User className="w-3.5 h-3.5" />
        <span>User View</span>
        {actualRole === "user" && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#248A3D]" title="Actual Role" />
        )}
      </button>

      <button
        type="button"
        onClick={() => onSelectRole("admin")}
        className={cn(
          "min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
          activeRoleView === "admin"
            ? "bg-white text-[#1D1D1F] shadow-xs"
            : "text-[#656565] hover:text-[#1D1D1F]"
        )}
        aria-pressed={activeRoleView === "admin"}
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Admin View</span>
        {actualRole === "admin" ? (
          <span className="w-1.5 h-1.5 rounded-full bg-[#248A3D]" title="Actual Role" />
        ) : (
          <span className="text-[10px] uppercase font-mono text-[#D97706] bg-[#FEF3C7] px-1 rounded-sm">
            Demo
          </span>
        )}
      </button>
    </div>
  );
}
