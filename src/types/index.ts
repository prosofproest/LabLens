// LabLens AI — Domain Type Definitions

export type UserRole = "user" | "admin";

export const APPROVED_DEPARTMENTS = [
  "Computer Science & Engineering",
  "Information Technology",
  "Electronics & Communication Engineering",
  "Electrical & Electronics Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "General Sciences & Humanities",
] as const;

export type Department = (typeof APPROVED_DEPARTMENTS)[number];

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  department: Department;
  createdAt: string; // ISO date string or formatted representation
}

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

export interface AuthContextType {
  user: import("firebase/auth").User | null;
  userProfile: UserProfile | null;
  actualRole: UserRole;
  activeRoleView: UserRole;
  isRoleSimulated: boolean;
  missingProfile: boolean;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string, dept: Department) => Promise<void>;
  logout: () => Promise<void>;
  retryCreateProfile: (name: string, dept: Department) => Promise<void>;
  setActiveRoleView: (role: UserRole) => void;
}
