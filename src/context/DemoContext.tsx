"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { FaultReport, EquipmentCategory, ReportPriority } from "@/types";
import { AdminTriageInput } from "@/lib/firebase/reports";
import { AdminStats } from "@/lib/mockAdminData";

export const DEMO_USER_PROFILE = {
  uid: "demo_user_alex",
  name: "Alex Chen",
  email: "alex.chen@campus.edu",
  department: "Computer Science & Engineering",
  role: "user" as const,
};

export const INITIAL_DEMO_REPORTS: FaultReport[] = [
  {
    id: "DEMO-TICKET-001",
    equipmentName: "Workstation Dell OptiPlex 7090",
    assetId: "LAB-CS-042",
    labName: "Advanced Computing Lab (Room 304)",
    description: "Display intermittently flickers and loses video output under 10 minutes of GPU rendering workload. Front diagnostic LED flashes amber code 2-7.",
    reportedBy: {
      uid: DEMO_USER_PROFILE.uid,
      name: DEMO_USER_PROFILE.name,
      email: DEMO_USER_PROFILE.email,
      department: DEMO_USER_PROFILE.department,
    },
    status: "Assigned",
    priority: "High",
    category: "Hardware",
    aiAnalysis: {
      isAiGenerated: true,
      status: "success",
      suggestedCategory: "Hardware",
      suggestedPriority: "High",
      executiveSummary: "GPU thermal throttling or PCI-e interface timing out under load.",
      possibleRootCause: "Chassis fan degradation causing auxiliary graphics card to overheat.",
      recommendedAction: "Inspect fan intake, re-seat graphics accelerator, verify thermal paste application.",
      analyzedAt: "2026-11-15T09:30:00Z",
    },
    assignedTechnician: "Ramesh Kumar (Hardware Specialist)",
    assignedAt: "2026-11-15T10:15:00Z",
    adminNotes: "Replacement cooling assembly dispatched to Room 304.",
    createdAt: "2026-11-15T09:20:00Z",
    updatedAt: "2026-11-15T10:15:00Z",
  },
  {
    id: "DEMO-TICKET-002",
    equipmentName: "Cisco Catalyst 2960 Switch - Rack 2",
    assetId: "NET-SW-019",
    labName: "Networking & Security Lab (Room 208)",
    description: "Ports 13 through 24 dropped link speed from 1Gbps to 10Mbps; packet loss exceeds 45% during multi-student lab practicals.",
    reportedBy: {
      uid: "demo_user_prof_sen",
      name: "Prof. Ananya Sen",
      email: "ananya.sen@college.edu",
      department: "Information Technology",
    },
    status: "In-Progress",
    priority: "Critical",
    category: "Network",
    aiAnalysis: {
      isAiGenerated: true,
      status: "success",
      suggestedCategory: "Network",
      suggestedPriority: "Critical",
      executiveSummary: "Secondary ASIC transceiver switch-bank failure or cable harness pinch.",
      possibleRootCause: "Faulty internal power rail feeding the second 12-port RJ45 PHY controller.",
      recommendedAction: "Connect rollover console cable, run hardware diagnostics, inspect patch panel punch-down.",
      analyzedAt: "2026-11-15T08:15:00Z",
    },
    assignedTechnician: "Priya Sharma (Network Specialist)",
    assignedAt: "2026-11-15T08:45:00Z",
    adminNotes: "Backup 24-port switch placed on standby in server room.",
    createdAt: "2026-11-15T08:00:00Z",
    updatedAt: "2026-11-15T09:00:00Z",
  },
  {
    id: "DEMO-TICKET-003",
    equipmentName: "Epson PowerLite Ceiling Projector",
    assetId: "PRJ-AV-104",
    labName: "Embedded Systems Lab (Room 112)",
    description: "Lamp indicator flashes red repeatedly; unit shuts down automatically after 90 seconds of projection.",
    reportedBy: {
      uid: DEMO_USER_PROFILE.uid,
      name: DEMO_USER_PROFILE.name,
      email: DEMO_USER_PROFILE.email,
      department: DEMO_USER_PROFILE.department,
    },
    status: "Reported",
    priority: "Medium",
    category: "Power/Electrical",
    aiAnalysis: {
      isAiGenerated: true,
      status: "success",
      suggestedCategory: "Power/Electrical",
      suggestedPriority: "Medium",
      executiveSummary: "Lamp module timer threshold exceeded or exhaust filter clogged.",
      possibleRootCause: "Thermal exhaust sensor cutoff triggered by dust accumulation on air intake.",
      recommendedAction: "Vacuum air intake sponge filter and check lamp elapsed runtime hours via service menu.",
      analyzedAt: "2026-11-15T11:00:00Z",
    },
    assignedTechnician: null,
    assignedAt: null,
    adminNotes: null,
    createdAt: "2026-11-15T10:55:00Z",
    updatedAt: "2026-11-15T10:55:00Z",
  },
  {
    id: "DEMO-TICKET-004",
    equipmentName: "Tektronix Digital Storage Oscilloscope",
    assetId: "INS-OSC-008",
    labName: "VLSI & Signals Lab (Room 214)",
    description: "Channel 2 probe calibration baseline shifts by 350mV when attenuation switch is set to 10X. System self-calibration failed.",
    reportedBy: {
      uid: "demo_user_rahul",
      name: "Rahul Verma",
      email: "rahul.verma@college.edu",
      department: "Electronics & Communication Engineering",
    },
    status: "Resolved",
    priority: "Low",
    category: "Peripheral",
    aiAnalysis: {
      isAiGenerated: true,
      status: "success",
      suggestedCategory: "Peripheral",
      suggestedPriority: "Low",
      executiveSummary: "Input BNC connector ground shield degradation or damaged probe compensation trimmer.",
      possibleRootCause: "Cracked BNC solder pin on main analog input daughterboard.",
      recommendedAction: "Test with calibrated replacement 10X probe; reflow solder on BNC connector if persistent.",
      analyzedAt: "2026-11-14T14:10:00Z",
    },
    assignedTechnician: "Suresh Patel (Instrumentation Tech)",
    assignedAt: "2026-11-14T14:40:00Z",
    adminNotes: "Replaced damaged passive probe cable. Calibration re-certified.",
    createdAt: "2026-11-14T14:00:00Z",
    updatedAt: "2026-11-14T16:30:00Z",
  },
  {
    id: "DEMO-TICKET-005",
    equipmentName: "HP LaserJet Enterprise Network Printer",
    assetId: "PRN-CS-012",
    labName: "Software Development Lab (Room 302)",
    description: "Internal duplexer tray jam error 13.02.00 occurs on every print run exceeding 3 pages. Paper sensor flag appears stuck.",
    reportedBy: {
      uid: DEMO_USER_PROFILE.uid,
      name: DEMO_USER_PROFILE.name,
      email: DEMO_USER_PROFILE.email,
      department: DEMO_USER_PROFILE.department,
    },
    status: "In-Review",
    priority: "Medium",
    category: "Peripheral",
    aiAnalysis: {
      isAiGenerated: true,
      status: "success",
      suggestedCategory: "Peripheral",
      suggestedPriority: "Medium",
      executiveSummary: "Mechanical paper pickup roller slippage or misaligned registration optosensor.",
      possibleRootCause: "Worn rubber pickup rollers causing micro-delays in paper advance timing.",
      recommendedAction: "Clean pickup rollers with isopropyl swab; inspect return spring on optical sensor lever.",
      analyzedAt: "2026-11-15T07:20:00Z",
    },
    assignedTechnician: null,
    assignedAt: null,
    adminNotes: "Ticket logged by lab assistant during morning practical session.",
    createdAt: "2026-11-15T07:10:00Z",
    updatedAt: "2026-11-15T07:30:00Z",
  },
  {
    id: "DEMO-TICKET-006",
    equipmentName: "Chroma Programmable AC/DC Power Source",
    assetId: "PWR-EE-005",
    labName: "Power Systems & Machines Lab (Room 101)",
    description: "Emergency circuit trip occurs when output voltage exceeds 48V under inductive coil load. Over-current latch requires master key reset.",
    reportedBy: {
      uid: "demo_user_dr_mehta",
      name: "Dr. Vikram Mehta",
      email: "vikram.mehta@college.edu",
      department: "Electrical & Electronics Engineering",
    },
    status: "Reported",
    priority: "Critical",
    category: "Power/Electrical",
    aiAnalysis: {
      isAiGenerated: true,
      status: "success",
      suggestedCategory: "Power/Electrical",
      suggestedPriority: "Critical",
      executiveSummary: "Back-EMF clamp diode breakdown or fast-acting trip setpoint misalignment.",
      possibleRootCause: "Inductive flyback spike overwhelming internal transient voltage suppressor (TVS).",
      recommendedAction: "Inspect snubber network across output terminals and verify bench breaker ratings.",
      analyzedAt: "2026-11-15T11:45:00Z",
    },
    assignedTechnician: null,
    assignedAt: null,
    adminNotes: null,
    createdAt: "2026-11-15T11:40:00Z",
    updatedAt: "2026-11-15T11:40:00Z",
  },
];

interface AddDemoReportInput {
  equipmentName: string;
  assetId: string;
  labName: string;
  description: string;
  imageUrl?: string;
  category?: EquipmentCategory;
}

export interface DemoContextType {
  reports: FaultReport[];
  userReports: FaultReport[];
  stats: AdminStats;
  addDemoReport: (input: AddDemoReportInput) => FaultReport;
  updateDemoTriage: (reportId: string, update: AdminTriageInput & { category?: EquipmentCategory }) => void;
  deleteDemoReport: (reportId: string) => void;
  resetDemoData: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

const STORAGE_KEY = "lablens_demo_reports_v1";

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [reports, setReports] = useState<FaultReport[]>(() => {
    if (typeof window === "undefined") {
      return INITIAL_DEMO_REPORTS;
    }
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return INITIAL_DEMO_REPORTS;
  });

  // Sync state changes to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    } catch {
      // Ignore quota or private-browsing restrictions
    }
  }, [reports]);

  // Derived user reports for Demo Student (Alex Chen)
  const userReports = useMemo(() => {
    return reports.filter((r) => r.reportedBy?.uid === DEMO_USER_PROFILE.uid);
  }, [reports]);

  // Dynamically derived administrative metrics
  const stats: AdminStats = useMemo(() => {
    return {
      totalReported: reports.length,
      pendingReview: reports.filter((r) => r.status === "Reported" || r.status === "In-Review").length,
      inProgress: reports.filter((r) => r.status === "In-Progress" || r.status === "Assigned").length,
      resolved: reports.filter((r) => r.status === "Resolved").length,
      criticalIssues: reports.filter(
        (r) => r.priority === "Critical" && r.status !== "Resolved" && r.status !== "Cancelled"
      ).length,
    };
  }, [reports]);

  // Add simulated fault report
  const addDemoReport = useCallback(
    (input: AddDemoReportInput): FaultReport => {
      const newId = `DEMO-TICKET-${String(Date.now()).slice(-4)}`;
      const nowIso = new Date().toISOString();

      // Realistic advisory AI evaluation simulation based on input keywords
      const lowerDesc = input.description.toLowerCase();

      let inferredCategory: EquipmentCategory = input.category || "Hardware";
      if (lowerDesc.includes("switch") || lowerDesc.includes("port") || lowerDesc.includes("network") || lowerDesc.includes("wifi")) {
        inferredCategory = "Network";
      } else if (lowerDesc.includes("power") || lowerDesc.includes("smoke") || lowerDesc.includes("sparks") || lowerDesc.includes("voltage") || lowerDesc.includes("breaker")) {
        inferredCategory = "Power/Electrical";
      } else if (lowerDesc.includes("display") || lowerDesc.includes("monitor") || lowerDesc.includes("projector") || lowerDesc.includes("probe") || lowerDesc.includes("printer")) {
        inferredCategory = "Peripheral";
      } else if (lowerDesc.includes("crash") || lowerDesc.includes("software") || lowerDesc.includes("driver") || lowerDesc.includes("os")) {
        inferredCategory = "Software";
      }

      let inferredPriority: ReportPriority = "Medium";
      if (lowerDesc.includes("smoke") || lowerDesc.includes("fire") || lowerDesc.includes("sparks") || lowerDesc.includes("critical") || lowerDesc.includes("all students")) {
        inferredPriority = "Critical";
      } else if (lowerDesc.includes("flicker") || lowerDesc.includes("shut down") || lowerDesc.includes("fails") || lowerDesc.includes("jam")) {
        inferredPriority = "High";
      }

      const newReport: FaultReport = {
        id: newId,
        equipmentName: input.equipmentName.trim(),
        assetId: input.assetId.trim().toUpperCase(),
        labName: input.labName.trim(),
        description: input.description.trim(),
        imageUrl: input.imageUrl,
        reportedBy: {
          uid: DEMO_USER_PROFILE.uid,
          name: DEMO_USER_PROFILE.name,
          email: DEMO_USER_PROFILE.email,
          department: DEMO_USER_PROFILE.department,
        },
        status: "Reported",
        priority: inferredPriority,
        category: inferredCategory,
        aiAnalysis: {
          isAiGenerated: true,
          status: "success",
          suggestedCategory: inferredCategory,
          suggestedPriority: inferredPriority,
          executiveSummary: `Automated triage evaluation for ${input.equipmentName}: symptom analysis indicates ${inferredCategory.toLowerCase()} failure requiring technician verification.`,
          possibleRootCause: `Symptom profile aligns with internal component malfunction or thermal excursion under laboratory runtime conditions.`,
          recommendedAction: `Inspect physical chassis, verify input connections, maintain safe clearance, and dispatch technician.`,
          analyzedAt: nowIso,
        },
        assignedTechnician: null,
        assignedAt: null,
        adminNotes: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setReports((prev) => [newReport, ...prev]);
      return newReport;
    },
    []
  );

  // Update administrative triage in demo state
  const updateDemoTriage = useCallback(
    (reportId: string, update: AdminTriageInput & { category?: EquipmentCategory }) => {
      const nowIso = new Date().toISOString();
      setReports((prev) =>
        prev.map((r) => {
          if (r.id !== reportId) return r;

          const trimmedTech = update.assignedTechnician?.trim() || "";
          const prevTech = r.assignedTechnician?.trim() || "";

          let finalAssignedAt = r.assignedAt;
          if (trimmedTech) {
            if (trimmedTech !== prevTech) {
              finalAssignedAt = nowIso;
            } else {
              finalAssignedAt = r.assignedAt || nowIso;
            }
          } else {
            finalAssignedAt = null;
          }

          return {
            ...r,
            status: update.status,
            priority: update.priority,
            category: update.category || r.category,
            assignedTechnician: trimmedTech || null,
            assignedAt: finalAssignedAt,
            adminNotes: update.adminNotes?.trim() || null,
            updatedAt: nowIso,
          };
        })
      );
    },
    []
  );

  // Delete simulated report
  const deleteDemoReport = useCallback((reportId: string) => {
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  }, []);

  // Reset to initial baseline
  const resetDemoData = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    setReports(INITIAL_DEMO_REPORTS);
  }, []);

  const value = useMemo(
    () => ({
      reports,
      userReports,
      stats,
      addDemoReport,
      updateDemoTriage,
      deleteDemoReport,
      resetDemoData,
    }),
    [reports, userReports, stats, addDemoReport, updateDemoTriage, deleteDemoReport, resetDemoData]
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextType {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemo must be used within a DemoProvider");
  }
  return context;
}
