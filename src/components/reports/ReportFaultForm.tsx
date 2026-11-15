"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createFaultReport } from "@/lib/firebase/reports";
import { CAMPUS_LABS, AiSuggestionData } from "@/types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/reports/ImageUpload";
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export function ReportFaultForm() {
  const router = useRouter();
  const { user, userProfile } = useAuth();

  const [equipmentName, setEquipmentName] = useState("");
  const [assetId, setAssetId] = useState("");
  const [labName, setLabName] = useState<string>(CAMPUS_LABS[0]);
  const [customLab, setCustomLab] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [imagePublicId, setImagePublicId] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [submissionStep, setSubmissionStep] = useState<"idle" | "analyzing" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isCustomLab = labName === "Other / Custom Room";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user || !userProfile) {
      setError("You must be logged in with a completed user profile to report equipment faults.");
      return;
    }

    const trimmedEquipment = equipmentName.trim();
    const trimmedAsset = assetId.trim().toUpperCase();
    const finalLab = isCustomLab ? customLab.trim() : labName.trim();
    const trimmedDesc = description.trim();

    if (!trimmedEquipment || trimmedEquipment.length < 2) {
      setError("Please provide a valid equipment name (minimum 2 characters).");
      return;
    }

    if (!trimmedAsset || trimmedAsset.length < 2) {
      setError("Please enter the equipment Asset ID or Serial Tag (e.g. LAB-CS-042).");
      return;
    }

    if (!finalLab || finalLab.length < 2) {
      setError("Please specify the laboratory room name.");
      return;
    }

    if (!trimmedDesc || trimmedDesc.length < 5) {
      setError("Please describe the fault or symptoms in detail (at least 5 characters).");
      return;
    }

    try {
      setLoading(true);
      setSubmissionStep("analyzing");

      let aiAnalysis: AiSuggestionData = {
        isAiGenerated: false,
        status: "unavailable",
        suggestedCategory: "Other",
        suggestedPriority: "Medium",
        executiveSummary: "Automated analysis was unavailable during ticket submission.",
        possibleRootCause: "Live AI evaluation service could not be reached or timed out.",
        recommendedAction: "Maintain safe physical clearance and await technician triage.",
        analyzedAt: new Date().toISOString(),
      };

      try {
        const idToken = await user.getIdToken();
        const triageController = new AbortController();
        const triageTimeout = setTimeout(() => triageController.abort(), 8000);

        const triageRes = await fetch("/api/reports/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            equipmentName: trimmedEquipment,
            assetId: trimmedAsset,
            labName: finalLab,
            description: trimmedDesc,
          }),
          signal: triageController.signal,
        });

        clearTimeout(triageTimeout);

        if (triageRes.ok) {
          const triageData = await triageRes.json();
          if (triageData.analysis) {
            aiAnalysis = triageData.analysis;
          }
        }
      } catch (triageErr) {
        console.warn("AI Triage unavailable, proceeding with resilient report submission:", triageErr);
      }

      setSubmissionStep("saving");

      await createFaultReport(
        {
          equipmentName: trimmedEquipment,
          assetId: trimmedAsset,
          labName: finalLab,
          description: trimmedDesc,
          imageUrl,
          imagePublicId,
          aiAnalysis,
        },
        {
          uid: user.uid,
          name: userProfile.name,
          email: userProfile.email,
          department: userProfile.department,
        }
      );

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err: unknown) {
      console.error("Fault report submission error:", err);
      const message =
        err instanceof Error ? err.message : "Failed to record fault report. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
      setSubmissionStep("idle");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 sm:p-8 shadow-xs max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-xs text-[#0071E3] hover:underline mb-2 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1D1D1F]">
          Report Equipment Malfunction
        </h1>
        <p className="text-xs text-[#656565] leading-relaxed">
          Log damaged instruments, hardware failures, or software anomalies to dispatch lab technicians.
        </p>
      </div>

      {/* Success Notification */}
      {success && (
        <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#86EFAC] text-[#15803D] flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <div className="text-xs font-medium">
            Fault report submitted successfully! Redirecting to your dashboard...
          </div>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div className="text-xs font-medium leading-relaxed">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Equipment Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="equipment-name"
            className="block text-xs font-semibold uppercase tracking-wider text-[#1D1D1F]"
          >
            Equipment Name <span className="text-[#DC2626]">*</span>
          </label>
          <Input
            id="equipment-name"
            placeholder="e.g. Workstation Dell OptiPlex 7090 or Tektronix Oscilloscope"
            value={equipmentName}
            onChange={(e) => setEquipmentName(e.target.value)}
            disabled={loading || success}
            required
          />
        </div>

        {/* Asset ID & Lab Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="asset-id"
              className="block text-xs font-semibold uppercase tracking-wider text-[#1D1D1F]"
            >
              Asset Tag / Serial ID <span className="text-[#DC2626]">*</span>
            </label>
            <Input
              id="asset-id"
              placeholder="e.g. LAB-CS-042"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              disabled={loading || success}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="lab-name"
              className="block text-xs font-semibold uppercase tracking-wider text-[#1D1D1F]"
            >
              Laboratory Location <span className="text-[#DC2626]">*</span>
            </label>
            <div className="relative">
              <select
                id="lab-name"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                disabled={loading || success}
                className="w-full min-h-[44px] rounded-xl border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-xs text-[#1D1D1F] shadow-2xs transition-all duration-200 focus:border-[#0071E3] focus:outline-none focus:ring-3 focus:ring-[#0071E3]/15 disabled:bg-[#F5F5F7]"
              >
                {CAMPUS_LABS.map((lab) => (
                  <option key={lab} value={lab}>
                    {lab}
                  </option>
                ))}
                <option value="Other / Custom Room">Other / Custom Room...</option>
              </select>
            </div>
          </div>
        </div>

        {/* Custom Room Input if selected */}
        {isCustomLab && (
          <div className="space-y-1.5">
            <label
              htmlFor="custom-lab"
              className="block text-xs font-semibold uppercase tracking-wider text-[#1D1D1F]"
            >
              Specify Laboratory Room Name <span className="text-[#DC2626]">*</span>
            </label>
            <Input
              id="custom-lab"
              placeholder="e.g. High Voltage Lab (Building B, Room 102)"
              value={customLab}
              onChange={(e) => setCustomLab(e.target.value)}
              disabled={loading || success}
              required
            />
          </div>
        )}

        {/* Problem Description */}
        <div className="space-y-1.5">
          <label
            htmlFor="fault-description"
            className="block text-xs font-semibold uppercase tracking-wider text-[#1D1D1F]"
          >
            Fault Symptoms & Description <span className="text-[#DC2626]">*</span>
          </label>
          <textarea
            id="fault-description"
            rows={4}
            placeholder="Describe what occurred, error codes, unusual noise, blinking LEDs, or non-responsive behaviors..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading || success}
            required
            className="w-full rounded-xl border border-[#E5E5EA] bg-white p-3.5 text-xs text-[#1D1D1F] placeholder:text-[#86868B] shadow-2xs transition-all duration-200 focus:border-[#0071E3] focus:outline-none focus:ring-3 focus:ring-[#0071E3]/15 disabled:bg-[#F5F5F7] resize-none"
          />
        </div>

        {/* Optional Media Upload */}
        <ImageUpload
          value={imageUrl}
          onChange={(url, publicId) => {
            setImageUrl(url);
            setImagePublicId(publicId);
          }}
          disabled={loading || success}
        />

        {/* Reporter info callout */}
        <div className="p-3 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] text-[11px] text-[#656565]">
          Submitting as: <strong className="text-[#1D1D1F]">{userProfile?.name}</strong> ({userProfile?.email}) • Dept: <span className="text-[#1D1D1F]">{userProfile?.department}</span>
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <Link
            href="/dashboard"
            className="min-h-[44px] px-5 py-2.5 rounded-xl border border-[#E5E5EA] bg-white text-xs font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors flex items-center justify-center"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={loading || success}
            className="min-h-[44px]"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin" />
                {submissionStep === "analyzing" ? "Consulting Groq AI..." : "Saving Ticket..."}
              </span>
            ) : (
              "Submit Fault Report"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

