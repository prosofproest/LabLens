// LabLens AI — Domain Type Definitions

export type UserRole = "user" | "admin";

export type ReportStatus =
  | "Reported"
  | "In-Review"
  | "Assigned"
  | "In-Progress"
  | "Resolved"
  | "Cancelled";

export type ReportPriority = "Low" | "Medium" | "High" | "Critical";

export type EquipmentCategory =
  | "Hardware"
  | "Software"
  | "Network"
  | "Power/Electrical"
  | "Peripheral"
  | "Other";

export interface AiSuggestionData {
  isAiGenerated: boolean;
  status: "success" | "unavailable" | "skipped";
  suggestedCategory: EquipmentCategory;
  suggestedPriority: ReportPriority;
  executiveSummary: string;
  possibleRootCause: string;
  recommendedAction: string;
  confidenceScore: number;
  analyzedAt: string;
}

export interface FaultReport {
  id: string;
  equipmentName: string;
  assetId: string;
  labName: string;
  description: string;
  imageUrl?: string;
  reportedBy: {
    uid: string;
    name: string;
    email: string;
  };
  status: ReportStatus;
  priority: ReportPriority;
  aiAnalysis: AiSuggestionData | null;
  assignedTechnician: string | null;
  assignedAt: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}
