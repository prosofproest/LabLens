"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDemo } from "@/context/DemoContext";
import { ShieldCheck, User, RotateCcw, LogIn, Sparkles, Check } from "lucide-react";

export function DemoBanner() {
  const pathname = usePathname();
  const { resetDemoData } = useDemo();
  const [resetSuccess, setResetSuccess] = useState(false);

  const isAdminView = pathname.startsWith("/demo/admin");

  const handleReset = () => {
    resetDemoData();
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 2000);
  };

  return (
    <div
      role="region"
      aria-label="Public Demonstration Controls"
      className="sticky top-16 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E5EA] shadow-xs"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Mode Identity & Guard Notice */}
          <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EBF5FF] text-[#0071E3] text-[11px] font-semibold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              Public Demo Mode
            </span>
            <span className="text-xs text-[#656565] hidden sm:inline">
              Operating on isolated academic mock data &bull; Zero Firestore writes
            </span>
          </div>

          {/* Role Switcher & Utilities */}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {/* Segmented Role Switcher */}
            <div
              role="radiogroup"
              aria-label="Demonstration Role"
              className="inline-flex items-center p-0.5 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA]"
            >
              <Link
                href="/demo"
                role="radio"
                aria-checked={!isAdminView}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  !isAdminView
                    ? "bg-white text-[#1D1D1F] shadow-xs"
                    : "text-[#656565] hover:text-[#1D1D1F]"
                }`}
              >
                <User className="w-3.5 h-3.5 text-[#0071E3]" />
                User Demo
              </Link>
              <Link
                href="/demo/admin"
                role="radio"
                aria-checked={isAdminView}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isAdminView
                    ? "bg-white text-[#1D1D1F] shadow-xs"
                    : "text-[#656565] hover:text-[#1D1D1F]"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
                Admin Demo
              </Link>
            </div>

            {/* Reset Data Button */}
            <button
              type="button"
              onClick={handleReset}
              title="Reset mock data back to default state"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#656565] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] border border-[#E5E5EA] transition-colors cursor-pointer min-h-[32px]"
            >
              {resetSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#248A3D]" />
                  <span className="text-[#248A3D]">Reset</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Demo</span>
                </>
              )}
            </button>

            {/* Exit Demo / Institutional Sign In */}
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#0071E3] hover:underline px-2 py-1 min-h-[32px]"
            >
              <LogIn className="w-3.5 h-3.5 mr-0.5" />
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
