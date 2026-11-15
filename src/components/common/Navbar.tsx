"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X, ShieldAlert, LogOut, LayoutDashboard, PlusCircle } from "lucide-react";
import { buttonStyles } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { RolePreviewSelector } from "@/components/auth/RolePreviewSelector";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, userProfile, actualRole, activeRoleView, setActiveRoleView, logout } = useAuth();

  const navLinks = [
    { label: "Overview", href: "/#overview" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Features", href: "/#features" },
    { label: "Sample Report", href: "/#sample-report" },
  ];

  const dashboardHref = activeRoleView === "admin" ? "/admin" : "/dashboard";

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Identity */}
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[#1D1D1F] hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] rounded-lg p-1.5 min-h-[44px]"
          >
            <div className="w-8 h-8 rounded-lg bg-[#0071E3] flex items-center justify-center text-white shadow-sm">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-semibold text-[17px] tracking-tight leading-tight">
                LabLens <span className="text-[#0071E3]">AI</span>
              </span>
              <span className="text-[10px] text-[#86868B] uppercase tracking-wider font-medium">
                Lab Intelligence
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-4">
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

          {/* Desktop Action & Auth State */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {/* Role Switcher for Hackathon Demonstrations */}
                <RolePreviewSelector
                  activeRoleView={activeRoleView}
                  actualRole={actualRole}
                  onSelectRole={setActiveRoleView}
                />

                <Link
                  href="/report"
                  className={buttonStyles({ variant: "primary", size: "sm" })}
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1" />
                  Report Fault
                </Link>

                <Link
                  href={dashboardHref}
                  className={buttonStyles({ variant: "outline", size: "sm" })}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 mr-1" />
                  Dashboard
                </Link>

                <div className="flex items-center gap-2 pl-2 border-l border-[#E5E5EA]">
                  <Badge variant={actualRole === "admin" ? "success" : "neutral"} size="sm">
                    {userProfile?.name ? userProfile.name.split(" ")[0] : "User"} (
                    {actualRole === "admin" ? "Admin" : "User"})
                  </Badge>
                  <button
                    type="button"
                    onClick={logout}
                    className="p-2 rounded-lg text-[#656565] hover:text-[#DC2626] hover:bg-[#FEE2E2]/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                    aria-label="Sign out"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={buttonStyles({ variant: "ghost", size: "sm" })}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className={buttonStyles({ variant: "primary", size: "sm" })}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {user && (
              <Badge variant={actualRole === "admin" ? "success" : "neutral"} size="sm">
                {actualRole === "admin" ? "Admin" : "User"}
              </Badge>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="min-w-[44px] min-h-[44px] p-2.5 rounded-lg text-[#656565] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] flex items-center justify-center cursor-pointer"
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
          {user && (
            <div className="pb-3 border-b border-[#E5E5EA] space-y-2">
              <div className="flex items-center justify-between text-xs text-[#656565]">
                <span>Logged in as <strong>{user.email}</strong></span>
                <Badge variant={actualRole === "admin" ? "success" : "neutral"} size="sm">
                  {actualRole}
                </Badge>
              </div>
              <div className="pt-1">
                <RolePreviewSelector
                  activeRoleView={activeRoleView}
                  actualRole={actualRole}
                  onSelectRole={(r) => {
                    setActiveRoleView(r);
                    setMobileMenuOpen(false);
                  }}
                />
              </div>
            </div>
          )}

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
            {user ? (
              <>
                <Link
                  href="/report"
                  onClick={() => setMobileMenuOpen(false)}
                  className={buttonStyles({
                    variant: "primary",
                    size: "md",
                    className: "w-full",
                  })}
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Report Fault
                </Link>
                <Link
                  href={dashboardHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className={buttonStyles({
                    variant: "outline",
                    size: "md",
                    className: "w-full",
                  })}
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className={buttonStyles({
                    variant: "outline",
                    size: "md",
                    className: "w-full text-[#DC2626] border-[#FECACA] hover:bg-[#FEE2E2]/30",
                  })}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className={buttonStyles({
                    variant: "secondary",
                    size: "md",
                    className: "w-full",
                  })}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className={buttonStyles({
                    variant: "primary",
                    size: "md",
                    className: "w-full",
                  })}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
