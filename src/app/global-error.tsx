"use client";

import React, { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("Global root layout error captured:", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex items-center justify-center p-4 font-sans antialiased">
        <div
          role="alert"
          aria-live="assertive"
          className="max-w-md w-full bg-white rounded-3xl border border-[#E5E5EA] p-8 sm:p-10 shadow-lg text-center space-y-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#FEE2E2]/80 text-[#DC2626] mx-auto flex items-center justify-center border border-[#FECACA]">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">
              Critical System Error
            </h1>
            <p className="text-sm text-[#656565] leading-relaxed">
              LabLens AI encountered an unrecoverable root layout failure. Please reload the application or contact campus IT support.
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
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl border border-[#E5E5EA] bg-white hover:bg-[#F5F5F7] text-sm font-medium text-[#1D1D1F] transition-all cursor-pointer"
            >
              Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
