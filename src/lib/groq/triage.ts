// Server-only Groq AI automated fault report triage service
// DO NOT import this file into Client Components.

import { getGroqClient, getValidatedGroqModel } from "./client";
import { AiSuggestionData, EquipmentCategory, ReportPriority } from "@/types";

export const VALID_CATEGORIES: EquipmentCategory[] = [
  "Hardware",
  "Software",
  "Network",
  "Power/Electrical",
  "Peripheral",
  "Other",
];

export const VALID_PRIORITIES: ReportPriority[] = [
  "Low",
  "Medium",
  "High",
  "Critical",
];

export interface TriageInput {
  equipmentName: string;
  assetId: string;
  labName: string;
  description: string;
}

export function createUnavailableAiAnalysis(customReason?: string): AiSuggestionData {
  return {
    isAiGenerated: false,
    status: "unavailable",
    suggestedCategory: "Other",
    suggestedPriority: "Medium",
    executiveSummary:
      customReason || "Automated symptom triage was unavailable at report creation time.",
    possibleRootCause:
      "Automated evaluation service was unreachable or timed out during submission.",
    recommendedAction:
      "Maintain a safe physical clearance from the equipment and await certified departmental technician inspection.",
    analyzedAt: new Date().toISOString(),
  };
}

const SYSTEM_TRIAGE_PROMPT = `You are LabLens Triage AI, an expert academic laboratory equipment diagnostics assistant.
Your task is to analyze equipment fault symptoms reported by students and faculty, and provide a structured advisory triage assessment.

MANDATORY SAFETY PROTOCOL:
1. NEVER instruct the user to open device casings, dismantle power supplies, touch internal components or capacitors, use multimeter probes on live circuits, or attempt physical repairs.
2. ONLY recommend powering off at the wall outlet if it is safe to do so without touching exposed, sparking, or hot components.
3. ALWAYS instruct the user to maintain a safe physical distance, keep others away from the station, post an out-of-order notice, and wait for authorized departmental technical staff.

Output your assessment STRICTLY as a JSON object with this exact structure:
{
  "suggestedCategory": "Hardware" | "Software" | "Network" | "Power/Electrical" | "Peripheral" | "Other",
  "suggestedPriority": "Low" | "Medium" | "High" | "Critical",
  "executiveSummary": "1-2 sentence concise technical summary of the issue",
  "possibleRootCause": "Plausible engineering hypothesis based on described symptoms",
  "recommendedAction": "Non-invasive, safety-conscious first response and containment instruction"
}`;

/**
 * Executes Groq AI triage on equipment malfunction symptoms.
 * Employs strict 8-second timeout and fails safely to unavailable state if Groq is unreachable.
 */
export async function analyzeFaultReport(input: TriageInput): Promise<AiSuggestionData> {
  const model = getValidatedGroqModel();
  const groq = getGroqClient();

  const userPrompt = `Laboratory Equipment: ${input.equipmentName}
Asset Tag / ID: ${input.assetId}
Laboratory Room: ${input.labName}
Reported Symptoms: ${input.description}

Analyze the malfunction and respond with the required JSON object.`;

  // 8-second timeout signal
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const completion = await groq.chat.completions.create(
      {
        model,
        messages: [
          { role: "system", content: SYSTEM_TRIAGE_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2, // Low temperature for deterministic classification
        max_tokens: 500,
      },
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("Empty response returned by Groq AI.");
    }

    const parsed = JSON.parse(rawContent);

    // Validate category
    const category: EquipmentCategory = VALID_CATEGORIES.includes(parsed.suggestedCategory)
      ? parsed.suggestedCategory
      : "Other";

    // Validate priority
    const priority: ReportPriority = VALID_PRIORITIES.includes(parsed.suggestedPriority)
      ? parsed.suggestedPriority
      : "Medium";

    const summary = typeof parsed.executiveSummary === "string" && parsed.executiveSummary.trim().length > 0
      ? parsed.executiveSummary.trim()
      : "Equipment anomaly logged for technical review.";

    const cause = typeof parsed.possibleRootCause === "string" && parsed.possibleRootCause.trim().length > 0
      ? parsed.possibleRootCause.trim()
      : "Unknown hardware or software fault requiring diagnostic tools.";

    const action = typeof parsed.recommendedAction === "string" && parsed.recommendedAction.trim().length > 0
      ? parsed.recommendedAction.trim()
      : "Maintain physical clearance and await certified technician inspection.";

    return {
      isAiGenerated: true,
      status: "success",
      suggestedCategory: category,
      suggestedPriority: priority,
      executiveSummary: summary,
      possibleRootCause: cause,
      recommendedAction: action,
      analyzedAt: new Date().toISOString(),
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    console.error("Groq AI triage execution failed:", err instanceof Error ? err.message : err);
    return createUnavailableAiAnalysis();
  }
}
