// Realistic Demonstration Dataset for Admin Preview Mode
// Used exclusively during Role Preview simulations to avoid exposing or querying live Firestore data.

import { FaultReport } from "@/types";

export interface AdminStats {
  totalReported: number;
  pendingReview: number;
  inProgress: number;
  resolved: number;
  criticalIssues: number;
}

export const MOCK_ADMIN_STATS: AdminStats = {
  totalReported: 24,
  pendingReview: 6,
  inProgress: 11,
  resolved: 7,
  criticalIssues: 3,
};

export const MOCK_ADMIN_REPORTS: FaultReport[] = [
  {
    id: "DEMO-TICKET-001",
    equipmentName: "Workstation Dell OptiPlex 7090",
    assetId: "LAB-CS-042",
    labName: "Advanced Computing Lab (Room 304)",
    description: "Display intermittently flickers and loses video output under 10 minutes of GPU rendering workload. Front diagnostic LED flashes amber code 2-7.",
    reportedBy: {
      uid: "demo_user_1",
      name: "Siddharth Rao",
      email: "siddharth.cs@college.edu",
    },
    status: "Assigned",
    priority: "High",
    aiAnalysis: {
      isAiGenerated: true,
      status: "success",
      suggestedCategory: "Hardware",
      suggestedPriority: "High",
      executiveSummary: "GPU thermal throttling or PCI-e interface timing out under load.",
      possibleRootCause: "Chassis fan degradation causing auxiliary graphics card to overheat.",
      recommendedAction: "Inspect fan intake, re-seat graphics accelerator, verify thermal paste application.",
      confidenceScore: 0.92,
      analyzedAt: "2026-11-15T09:30:00Z",
    },
    assignedTechnician: "Ramesh Kumar (Hardware)",
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
      uid: "demo_user_2",
      name: "Prof. Ananya Sen",
      email: "ananya.sen@college.edu",
    },
    status: "In-Progress",
    priority: "Critical",
    aiAnalysis: {
      isAiGenerated: true,
      status: "success",
      suggestedCategory: "Network",
      suggestedPriority: "Critical",
      executiveSummary: "Secondary ASIC transceiver switch-bank failure or cable harness pinch.",
      possibleRootCause: "Faulty internal power rail feeding the second 12-port RJ45 PHY controller.",
      recommendedAction: "Connect rollover console cable, run hardware diagnostics, inspect patch panel punch-down.",
      confidenceScore: 0.88,
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
      uid: "demo_user_3",
      name: "Kavita Nair",
      email: "kavita.ece@college.edu",
    },
    status: "Reported",
    priority: "Medium",
    aiAnalysis: {
      isAiGenerated: true,
      status: "success",
      suggestedCategory: "Power/Electrical",
      suggestedPriority: "Medium",
      executiveSummary: "Lamp module timer threshold exceeded or exhaust filter clogged.",
      possibleRootCause: "Thermal exhaust sensor cutoff triggered by dust accumulation on air intake.",
      recommendedAction: "Vacuum air intake sponge filter and check lamp elapsed runtime hours via service menu.",
      confidenceScore: 0.94,
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
      uid: "demo_user_4",
      name: "Rahul Verma",
      email: "rahul.verma@college.edu",
    },
    status: "Resolved",
    priority: "Low",
    aiAnalysis: {
      isAiGenerated: true,
      status: "success",
      suggestedCategory: "Peripheral",
      suggestedPriority: "Low",
      executiveSummary: "Input BNC connector ground shield degradation or damaged probe compensation trimmer.",
      possibleRootCause: "Cracked BNC solder pin on main analog input daughterboard.",
      recommendedAction: "Test with calibrated replacement 10X probe; reflow solder on BNC connector if persistent.",
      confidenceScore: 0.86,
      analyzedAt: "2026-11-14T14:10:00Z",
    },
    assignedTechnician: "Suresh Patel (Instrumentation)",
    assignedAt: "2026-11-14T14:40:00Z",
    adminNotes: "Replaced damaged passive probe cable. Calibration re-certified.",
    createdAt: "2026-11-14T14:00:00Z",
    updatedAt: "2026-11-14T16:30:00Z",
  },
];

