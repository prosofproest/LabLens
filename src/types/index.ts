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

export const CAMPUS_LABS = [
  "Advanced Computing Lab (Room 304)",
  "Networking & Security Lab (Room 208)",
  "IoT & Embedded Systems Lab (Room 112)",
  "VLSI & Digital Circuits Lab (Room 214)",
  "Power Systems & Machines Lab (Room 101)",
  "Robotics & Automation Lab (Room 220)",
  "CAD/CAM Simulation Lab (Room 401)",
  "Materials Testing Lab (Room 004)",
  "Data Engineering & AI Lab (Room 310)",
  "Software Development Lab (Room 302)",
] as const;

export type CampusLab = (typeof CAMPUS_LABS)[number];

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
  analyzedAt: string;
}

export interface FaultReport {
  id: string;
  equipmentName: string;
  assetId: string;
  labName: string;
  description: string;
  imageUrl?: string;
  imagePublicId?: string;
  reportedBy: {
    uid: string;
    name: string;
    email: string;
    department?: string;
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

export interface CreateReportInput {
  equipmentName: string;
  assetId: string;
  labName: string;
  description: string;
  imageUrl?: string;
  imagePublicId?: string;
  aiAnalysis?: AiSuggestionData | null;
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
