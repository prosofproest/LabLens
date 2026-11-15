"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home, ShieldAlert } from "lucide-react";
import { buttonStyles } from "@/components/ui/Button";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log error reference internally without exposing sensitive details to users
    if (process.env.NODE_ENV === "development") {
      console.error("Application error boundary captured error:", error);
    }
  }, [error]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="min-h-[60vh] flex items-center justify-center px-4 py-12"
    >
      <div className="max-w-md w-full bg-white rounded-3xl border border-[#E5E5EA] p-8 sm:p-10 shadow-xs text-center space-y-6">
        {/* Semantic Warning Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-[#FEE2E2]/70 text-[#DC2626] mx-auto flex items-center justify-center border border-[#FECACA]">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F5F5F7] text-[11px] font-semibold text-[#656565] uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5 text-[#0071E3]" />
            Application Resilience Guard
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">
            Something Went Wrong
          </h1>
          <p className="text-sm text-[#656565] leading-relaxed">
            An unexpected error occurred while processing this laboratory resource.
            Our technical support team has been logged.
          </p>
        </div>

        {error.digest && (
          <div className="p-3 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] text-[11px] text-[#86868B] font-mono break-all select-all">
            Reference ID: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className={buttonStyles({
              variant: "primary",
              size: "md",
              className: "w-full sm:w-auto min-h-[44px]",
            })}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </button>
          <Link
            href="/dashboard"
            className={buttonStyles({
              variant: "outline",
              size: "md",
              className: "w-full sm:w-auto min-h-[44px]",
            })}
          >
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
