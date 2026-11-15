"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export function Footer() {
  const currentYear = 2026;

  return (
    <footer className="bg-white border-t border-[#E5E5EA] py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-[#E5E5EA]">
          {/* Brand Info */}
          <div className="space-y-1.5 max-w-md">
            <Link
              href="#top"
              className="flex items-center gap-2 text-[#1D1D1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] rounded-md p-1"
            >
              <div className="w-6 h-6 rounded-md bg-[#0071E3] flex items-center justify-center text-white">
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-base tracking-tight">
                LabLens <span className="text-[#0071E3]">AI</span>
              </span>
            </Link>
            <p className="text-xs text-[#656565] leading-relaxed">
              Smart Laboratory Fault Reporting and Equipment Intelligence Platform.
              Built for educational laboratory equipment management.
            </p>
          </div>

          {/* Working Section Anchor Links */}
          <nav className="flex flex-wrap items-center gap-6 text-xs text-[#656565]">
            <a
              href="#overview"
              className="hover:text-[#1D1D1F] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] rounded-md px-1.5 py-0.5"
            >
              Overview
            </a>
            <a
              href="#how-it-works"
              className="hover:text-[#1D1D1F] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] rounded-md px-1.5 py-0.5"
            >
              How It Works
            </a>
            <a
              href="#features"
              className="hover:text-[#1D1D1F] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] rounded-md px-1.5 py-0.5"
            >
              Core Features
            </a>
            <a
              href="#sample-report"
              className="hover:text-[#1D1D1F] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] rounded-md px-1.5 py-0.5"
            >
              Demonstration
            </a>
            <a
              href="#top"
              className="hover:text-[#1D1D1F] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] rounded-md px-1.5 py-0.5"
            >
              Back to Top
            </a>
          </nav>
        </div>

        {/* Bottom Note */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#86868B]">
          <p>
            &copy; {currentYear} LabLens AI. Student Engineering Project.
          </p>
          <p className="text-[11px]">
            AI diagnostic outputs are advisory suggestions that require human technical verification.
          </p>
        </div>
      </div>
    </footer>
  );
}
