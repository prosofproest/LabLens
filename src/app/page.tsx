import React from "react";
import Link from "next/link";
import {
  Wrench,
  Sparkles,
  ClipboardList,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  Cpu,
  UserCheck,
  ShieldCheck,
  User,
} from "lucide-react";
import { buttonStyles } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function Home() {
  return (
    <div className="space-y-20 py-10 md:py-16">
      {/* 1. HERO SECTION & ROLE SELECTION */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        {/* Category Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E5E5EA] shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#0071E3]" />
          <span className="text-xs font-semibold text-[#656565]">
            Academic Laboratory Equipment Intelligence
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#1D1D1F] max-w-4xl mx-auto leading-[1.12]">
          Smart Laboratory Fault Reporting and Equipment Intelligence.
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-[#656565] max-w-2xl mx-auto font-normal leading-relaxed">
          A centralized platform where users report equipment faults, AI provides advisory triage suggestions, and administrators manage repairs.
        </p>

        {/* PROMINENT ROLE SELECTION SECTION — DEMO ACCESS WITHOUT AUTHENTICATION */}
        <div className="pt-4 max-w-4xl mx-auto text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Demo Card */}
            <div className="bg-white rounded-3xl border border-[#E5E5EA] p-7 sm:p-8 shadow-xs hover:border-[#0071E3]/50 hover:shadow-md transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#EBF5FF] text-[#0071E3] flex items-center justify-center shadow-xs">
                    <User className="w-6 h-6" />
                  </div>
                  <Badge variant="info" size="sm">
                    Student Demo
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold text-[#1D1D1F]">
                    User Demo
                  </h2>
                  <p className="text-sm text-[#656565] leading-relaxed">
                    Explore the student and faculty fault reporting portal. Submit simulated tickets, inspect AI advisory triage recommendations, and track ticket repair status.
                  </p>
                </div>

                <ul className="space-y-2 text-xs text-[#656565] pt-1 border-t border-[#E5E5EA]/70">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#248A3D] shrink-0" />
                    <span>Interactive fault submission with AI triage suggestions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#248A3D] shrink-0" />
                    <span>Personal ticket history (Reported to Resolved)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#248A3D] shrink-0" />
                    <span>Instant access &bull; No sign-in or registration required</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/demo"
                className={buttonStyles({
                  variant: "primary",
                  size: "lg",
                  className: "w-full justify-center min-h-[48px]",
                })}
              >
                Launch User Demo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>

            {/* Admin Demo Card */}
            <div className="bg-white rounded-3xl border border-[#E5E5EA] p-7 sm:p-8 shadow-xs hover:border-[#16A34A]/50 hover:shadow-md transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shadow-xs border border-[#BBF7D0]">
                    <ShieldCheck className="w-6 h-6 text-[#15803D]" />
                  </div>
                  <Badge variant="success" size="sm">
                    Admin Demo
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold text-[#1D1D1F]">
                    Admin Demo
                  </h2>
                  <p className="text-sm text-[#656565] leading-relaxed">
                    Explore the administrative operations command center. Browse campus laboratory tickets, triage equipment, assign technicians, and override category & priority.
                  </p>
                </div>

                <ul className="space-y-2 text-xs text-[#656565] pt-1 border-t border-[#E5E5EA]/70">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#248A3D] shrink-0" />
                    <span>Administrative metrics (Pending, In Progress, Critical)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#248A3D] shrink-0" />
                    <span>Omni-search, status filters, and dynamic lab selection</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#248A3D] shrink-0" />
                    <span>Live triage modal &bull; Technician assignment & category override</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/demo/admin"
                className={buttonStyles({
                  variant: "secondary",
                  size: "lg",
                  className: "w-full justify-center min-h-[48px]",
                })}
              >
                Launch Admin Demo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>

          {/* Institutional User Sign-In Footnote */}
          <div className="mt-6 text-center text-xs text-[#86868B]">
            University staff or student with existing campus credentials?{" "}
            <Link href="/login" className="text-[#0071E3] font-medium hover:underline">
              Sign In
            </Link>{" "}
            or{" "}
            <Link href="/register" className="text-[#0071E3] font-medium hover:underline">
              Register Institutional Account
            </Link>
          </div>
        </div>
      </section>

      {/* 2. DEMONSTRATION PREVIEW CARD (#sample-report) */}
      <section id="sample-report" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="text-center mb-6 space-y-2">
          <Badge variant="info" size="md">
            Sample Report — Demonstration Only
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight text-[#1D1D1F]">
            Interactive Ticket Preview
          </h2>
          <p className="text-sm text-[#86868B] max-w-xl mx-auto">
            Demonstration preview. Not a real submission or confirmed technical diagnosis. All AI outputs are suggestions that require human verification.
          </p>
        </div>

        {/* Sample Ticket Container */}
        <Card elevated className="border-[#E5E5EA] overflow-hidden">
          {/* Ticket Header */}
          <div className="bg-[#FAFAFC] px-6 py-4 border-b border-[#E5E5EA] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#E5E5EA] flex items-center justify-center text-[#0071E3] shadow-xs">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-[#1D1D1F]">
                    Workstation Dell OptiPlex 7090
                  </h3>
                  <span className="text-xs text-[#86868B] font-mono">
                    #LAB-CS-042
                  </span>
                </div>
                <p className="text-xs text-[#656565]">
                  Advanced Computing Lab — Room 304 &bull; Reported 2 hours ago
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="critical">High Priority</Badge>
              <Badge variant="info">Assigned</Badge>
            </div>
          </div>

          <CardContent className="p-6 md:p-8 space-y-6">
            {/* User Fault Description */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">
                User Reported Description
              </span>
              <p className="text-sm text-[#1D1D1F] leading-relaxed bg-[#F5F5F7] p-3.5 rounded-xl border border-[#E5E5EA]">
                &ldquo;Display intermittently flickers and loses video output under 10 minutes of GPU rendering workload. Front diagnostic LED flashes amber code 2-7. System requires hard power cycle to reboot.&rdquo;
              </p>
            </div>

            {/* AI-Assisted Advisory Suggestion Block */}
            <div className="rounded-2xl border border-[#B9E1FF] bg-[#F5F9FF] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#B9E1FF]/60 pb-3">
                <div className="flex items-center gap-2 text-[#0071E3]">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-semibold">
                    AI-Assisted Triage Suggestions
                  </span>
                </div>
                <Badge variant="info" size="sm">
                  Advisory Suggestion &bull; Requires Human Review
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="font-medium text-[#656565]">
                    Suggested Category:
                  </span>
                  <p className="font-semibold text-[#1D1D1F]">
                    Hardware / Graphics Accelerator Fault
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="font-medium text-[#656565]">
                    Suggested Priority:
                  </span>
                  <p className="font-semibold text-[#DC2626]">
                    High — Causes abrupt workstation failure during practicals
                  </p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <span className="font-medium text-[#656565]">
                    Possible Root Cause:
                  </span>
                  <p className="text-[#1D1D1F] leading-relaxed">
                    GPU thermal throttling or fan failure under compute load. Diagnostic LED code 2-7 aligns with memory/graphics interface timing out.
                  </p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <span className="font-medium text-[#656565]">
                    Recommended Action for Technician:
                  </span>
                  <p className="text-[#1D1D1F] leading-relaxed">
                    Inspect chassis ventilation fan, re-seat PCI-e graphics card, verify thermal paste application, and test with bench monitor.
                  </p>
                </div>
              </div>
            </div>

            {/* Administrative Assignment Info */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-4 text-xs text-[#656565] border-t border-[#E5E5EA]">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#0071E3]" />
                <span>
                  Assigned Technician:{" "}
                  <strong className="text-[#1D1D1F]">
                    Ramesh Kumar (Hardware Lab Staff)
                  </strong>
                </span>
              </div>
              <span className="text-[#86868B]">
                Administrator status verified &bull; Ready for inspection
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 3. PLATFORM OVERVIEW (#overview) */}
      <section id="overview" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight text-[#1D1D1F]">
            Centralized Laboratory Operations
          </h2>
          <p className="text-base text-[#656565] leading-relaxed">
            Replace fragmented manual logbooks and verbal complaints with a structured, transparent maintenance workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-7 space-y-4">
            <div className="w-11 h-11 rounded-xl bg-[#EBF5FF] text-[#0071E3] flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-[#1D1D1F]">
              Centralized Fault Intake
            </h3>
            <p className="text-sm text-[#656565] leading-relaxed">
              Standardized reporting with equipment asset ID, laboratory room, fault description, and optional photo attachment.
            </p>
          </Card>

          <Card className="p-7 space-y-4">
            <div className="w-11 h-11 rounded-xl bg-[#EBF5FF] text-[#0071E3] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-[#1D1D1F]">
              AI-Assisted Triage Suggestions
            </h3>
            <p className="text-sm text-[#656565] leading-relaxed">
              Groq AI analyzes fault descriptions to provide advisory categories, priority suggestions, possible causes, and action hints.
            </p>
          </Card>

          <Card className="p-7 space-y-4">
            <div className="w-11 h-11 rounded-xl bg-[#EBF5FF] text-[#0071E3] flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-[#1D1D1F]">
              Administrative Management
            </h3>
            <p className="text-sm text-[#656565] leading-relaxed">
              Lab administrators review tickets, assign technicians directly, update repair statuses, and track issues to resolution.
            </p>
          </Card>
        </div>
      </section>

      {/* 4. HOW IT WORKS (#how-it-works) */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight text-[#1D1D1F]">
            How LabLens AI Works
          </h2>
          <p className="text-base text-[#656565] leading-relaxed">
            A clear, 4-step workflow connecting students, faculty, AI assistance, and lab administrators.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              step: "01",
              title: "Submit Fault",
              desc: "User enters asset ID, lab room, equipment name, and detailed description of the malfunction.",
              icon: ClipboardList,
            },
            {
              step: "02",
              title: "AI Analysis",
              desc: "Groq AI evaluates the report and proposes category, priority, and troubleshooting suggestions.",
              icon: Sparkles,
            },
            {
              step: "03",
              title: "Admin Review",
              desc: "Administrator reviews AI suggestions, adjusts priority if needed, and assigns a technician.",
              icon: UserCheck,
            },
            {
              step: "04",
              title: "Track & Resolve",
              desc: "Ticket progresses from In-Progress to Resolved, maintaining full audit visibility for the lab.",
              icon: CheckCircle2,
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-white rounded-2xl border border-[#E5E5EA] p-6 space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-[#0071E3] bg-[#EBF5FF] px-2.5 py-1 rounded-full">
                  Step {item.step}
                </span>
                <item.icon className="w-4 h-4 text-[#86868B]" />
              </div>
              <h3 className="text-base font-semibold text-[#1D1D1F]">
                {item.title}
              </h3>
              <p className="text-xs text-[#656565] leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. CORE FEATURES (#features) */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight text-[#1D1D1F]">
            Engineered for Educational Laboratories
          </h2>
          <p className="text-base text-[#656565] leading-relaxed">
            Essential tools designed specifically for college computer science and engineering lab environments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 md:p-8 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#EBF5FF] text-[#0071E3] flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-[#1D1D1F]">
                Structured Equipment Metadata
              </h3>
            </div>
            <p className="text-sm text-[#656565] leading-relaxed">
              Track issues across workstations, lab servers, network switches, projectors, and peripheral devices using standardized asset identifiers.
            </p>
          </Card>

          <Card className="p-6 md:p-8 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#EBF5FF] text-[#0071E3] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-[#1D1D1F]">
                Advisory AI Insights with Human Review
              </h3>
            </div>
            <p className="text-sm text-[#656565] leading-relaxed">
              AI recommendations assist lab managers by drafting suggested categories and severity levels, while always leaving final control to human personnel.
            </p>
          </Card>

          <Card className="p-6 md:p-8 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#EBF5FF] text-[#0071E3] flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-[#1D1D1F]">
                Direct Technician Assignment
              </h3>
            </div>
            <p className="text-sm text-[#656565] leading-relaxed">
              Assign responsible lab staff or external technicians directly to each ticket with internal notes and assignment timestamps.
            </p>
          </Card>

          <Card className="p-6 md:p-8 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#EBF5FF] text-[#0071E3] flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-[#1D1D1F]">
                Dashboard Overview Statistics
              </h3>
            </div>
            <p className="text-sm text-[#656565] leading-relaxed">
              Monitor key lab operational indicators including total reported faults, pending investigations, active repairs, and resolved equipment.
            </p>
          </Card>
        </div>
      </section>

      {/* 6. CALL TO ACTION BANNER */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card elevated className="p-8 md:p-12 text-center bg-white border-[#E5E5EA] space-y-5">
          <Badge variant="info">Phase 1 Foundation</Badge>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#1D1D1F]">
            Built for Reliable Laboratory Operations
          </h2>
          <p className="text-sm md:text-base text-[#656565] max-w-xl mx-auto leading-relaxed">
            LabLens AI combines structured reporting, advisory AI triage, and simple administrative management to keep campus laboratories running efficiently.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#sample-report"
              className={buttonStyles({ variant: "primary", size: "lg" })}
            >
              Review Sample Demonstration
            </a>
            <a
              href="#features"
              className={buttonStyles({ variant: "secondary", size: "lg" })}
            >
              Explore Core Features
            </a>
          </div>
        </Card>
      </section>
    </div>
  );
}
