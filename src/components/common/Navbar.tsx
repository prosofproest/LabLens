"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
          {/* Brand Identity */}
          <Link
            href="#top"
            className="flex items-center gap-2.5 text-[#1D1D1F] hover:opacity-90 transition-opacity"
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

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#656565] hover:text-[#1D1D1F] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <a href="#sample-report">
              <Button variant="secondary" size="sm">
                View Demo
              </Button>
            </a>
            <a href="#overview">
              <Button variant="primary" size="sm">
                Explore Platform
              </Button>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#656565] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
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
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-[#656565] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-lg transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="pt-3 border-t border-[#E5E5EA] flex flex-col gap-2">
            <a
              href="#sample-report"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full"
            >
              <Button variant="secondary" size="md" className="w-full">
                View Sample Report
              </Button>
            </a>
            <a
              href="#overview"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full"
            >
              <Button variant="primary" size="md" className="w-full">
                Explore Platform
              </Button>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
