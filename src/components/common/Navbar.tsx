"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X, ShieldAlert } from "lucide-react";
import { buttonStyles } from "@/components/ui/Button";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Overview", href: "#overview" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "Sample Report", href: "#sample-report" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Identity (≥44px target) */}
          <Link
            href="#top"
            className="flex items-center gap-2.5 text-[#1D1D1F] hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] rounded-lg p-1.5 min-h-[44px]"
          >
            <div className="w-8 h-8 rounded-lg bg-[#0071E3] flex items-center justify-center text-white shadow-sm">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-[17px] tracking-tight leading-tight">
                LabLens <span className="text-[#0071E3]">AI</span>
              </span>
              <span className="text-[10px] text-[#86868B] uppercase tracking-wider font-medium">
                Lab Intelligence
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links (≥44px touch targets) */}
          <nav className="hidden md:flex items-center gap-5">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#656565] hover:text-[#1D1D1F] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] rounded-md px-2 py-2 min-h-[44px] inline-flex items-center"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop Action CTAs (Direct styled anchors, no button nesting) */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="#sample-report"
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              View Demo
            </a>
            <a
              href="#overview"
              className={buttonStyles({ variant: "primary", size: "sm" })}
            >
              Explore Platform
            </a>
          </div>

          {/* Mobile Menu Button (Explicit 44x44px target) */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="min-w-[44px] min-h-[44px] p-2.5 rounded-lg text-[#656565] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] flex items-center justify-center"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E5E5EA] bg-white px-4 pt-3 pb-5 space-y-3 shadow-lg">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 text-sm font-medium text-[#656565] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] min-h-[44px] flex items-center"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="pt-3 border-t border-[#E5E5EA] flex flex-col gap-2.5">
            <a
              href="#sample-report"
              onClick={() => setMobileMenuOpen(false)}
              className={buttonStyles({
                variant: "secondary",
                size: "md",
                className: "w-full",
              })}
            >
              View Sample Report
            </a>
            <a
              href="#overview"
              onClick={() => setMobileMenuOpen(false)}
              className={buttonStyles({
                variant: "primary",
                size: "md",
                className: "w-full",
              })}
            >
              Explore Platform
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
