"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDemo, DEMO_USER_PROFILE } from "@/context/DemoContext";
import { CAMPUS_LABS, EquipmentCategory } from "@/types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Sparkles,
  Upload,
} from "lucide-react";

const APPROVED_CATEGORIES: EquipmentCategory[] = [
  "Hardware",
  "Software",
  "Network",
  "Power/Electrical",
  "Peripheral",
  "Other",
];

export default function DemoReportPage() {
  const router = useRouter();
  const { addDemoReport } = useDemo();

  const [equipmentName, setEquipmentName] = useState("");
  const [assetId, setAssetId] = useState("");
  const [labName, setLabName] = useState<string>(CAMPUS_LABS[0]);
  const [customLab, setCustomLab] = useState("");
  const [category, setCategory] = useState<EquipmentCategory>("Hardware");
  const [description, setDescription] = useState("");
  const [simulatedPhotoName, setSimulatedPhotoName] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [submissionStep, setSubmissionStep] = useState<"idle" | "analyzing" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isCustomLab = labName === "Other / Custom Room";

  const handleSimulatedPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSimulatedPhotoName(file.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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

      // Brief simulated AI analysis phase to mimic real Groq triage inference
      await new Promise((resolve) => setTimeout(resolve, 600));

      setSubmissionStep("saving");
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Add to local in-memory demo state
      addDemoReport({
        equipmentName: trimmedEquipment,
        assetId: trimmedAsset,
        labName: finalLab,
        category,
        description: trimmedDesc,
        imageUrl: simulatedPhotoName
          ? "https://res.cloudinary.com/demo/image/upload/sample.jpg"
          : undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/demo");
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record demo report.");
      setLoading(false);
      setSubmissionStep("idle");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/demo"
          className="inline-flex items-center text-xs font-semibold text-[#656565] hover:text-[#1D1D1F] transition-colors py-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to User Demo
        </Link>
        <span className="text-xs text-[#86868B] font-mono">
          Demo Mode &bull; Isolated Memory
        </span>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-3xl border border-[#E5E5EA] p-6 sm:p-10 shadow-xs space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF5FF] text-[#0071E3] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Simulated Equipment Fault Intake
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F]">
            Report Laboratory Equipment Fault
          </h1>
          <p className="text-xs sm:text-sm text-[#656565] leading-relaxed">
            Submit equipment malfunction tickets to test the automated AI advisory evaluation and technician dispatch pipeline. Submissions are stored locally in-memory and do not modify production Firestore.
          </p>
        </div>

        {/* Demo Reporter Context */}
        <div className="rounded-2xl bg-[#F5F5F7] p-4 border border-[#E5E5EA] flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <span className="text-[#86868B] block">Reporting as Demo Student:</span>
            <span className="font-semibold text-[#1D1D1F]">
              {DEMO_USER_PROFILE.name} ({DEMO_USER_PROFILE.department})
            </span>
          </div>
          <span className="text-[#0071E3] font-mono text-[11px] bg-white px-2 py-1 rounded-lg border border-[#E5E5EA]">
            {DEMO_USER_PROFILE.email}
          </span>
        </div>

        {/* Success Banner */}
        {success && (
          <div
            role="status"
            aria-live="polite"
            className="p-5 rounded-2xl bg-[#DCFCE7] border border-[#BBF7D0] text-[#16A34A] flex items-start gap-3 shadow-xs animate-in fade-in duration-300"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-[#15803D]" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#15803D]">
                Demo Fault Report Recorded Successfully
              </h3>
              <p className="text-xs text-[#166534]">
                Advisory AI suggestions have been generated. Redirecting to your User Demo dashboard...
              </p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-[#FEE2E2]/70 border border-[#FECACA] text-[#DC2626] flex items-start gap-3 text-xs"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Equipment Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="equipmentName"
              className="block text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider"
            >
              Equipment Name <span className="text-[#DC2626]">*</span>
            </label>
            <Input
              id="equipmentName"
              placeholder="e.g. Workstation Dell OptiPlex 7090, Cisco Catalyst Switch"
              value={equipmentName}
              onChange={(e) => setEquipmentName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Asset ID & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label
                htmlFor="assetId"
                className="block text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider"
              >
                Asset Tag / Serial ID <span className="text-[#DC2626]">*</span>
              </label>
              <Input
                id="assetId"
                placeholder="e.g. LAB-CS-042"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="category"
                className="block text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider"
              >
                Equipment Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all cursor-pointer min-h-[44px]"
              >
                {APPROVED_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Laboratory Room Selection */}
          <div className="space-y-1.5">
            <label
              htmlFor="labName"
              className="block text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider"
            >
              Laboratory Room Location <span className="text-[#DC2626]">*</span>
            </label>
            <select
              id="labName"
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all cursor-pointer min-h-[44px]"
            >
              {CAMPUS_LABS.map((lab) => (
                <option key={lab} value={lab}>
                  {lab}
                </option>
              ))}
              <option value="Other / Custom Room">Other / Custom Room</option>
            </select>
          </div>

          {/* Custom Lab Input */}
          {isCustomLab && (
            <div className="space-y-1.5 animate-in fade-in duration-200">
              <label
                htmlFor="customLab"
                className="block text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider"
              >
                Specify Custom Laboratory Room <span className="text-[#DC2626]">*</span>
              </label>
              <Input
                id="customLab"
                placeholder="e.g. Advanced Photonics Lab (Room 512)"
                value={customLab}
                onChange={(e) => setCustomLab(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          )}

          {/* Fault Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="description"
              className="block text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider"
            >
              Detailed Malfunction Description <span className="text-[#DC2626]">*</span>
            </label>
            <textarea
              id="description"
              rows={4}
              placeholder="Describe symptoms, observed error codes, sounds, smells, or diagnostic LED behaviors..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              required
              className="w-full p-3.5 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] text-sm text-[#1D1D1F] placeholder:text-[#86868B] focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all resize-none leading-relaxed"
            />
          </div>

          {/* Simulated Photo Attachment */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider">
              Photo Attachment (Optional)
            </label>
            <div className="rounded-2xl border-2 border-dashed border-[#E5E5EA] p-5 text-center bg-[#F5F5F7]/50 hover:bg-[#F5F5F7] transition-colors relative cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleSimulatedPhoto}
                disabled={loading}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex flex-col items-center justify-center space-y-1.5 text-xs text-[#656565]">
                <Upload className="w-6 h-6 text-[#86868B]" />
                {simulatedPhotoName ? (
                  <span className="font-semibold text-[#0071E3]">{simulatedPhotoName}</span>
                ) : (
                  <span>Click to select equipment photo (Simulated preview)</span>
                )}
                <span className="text-[11px] text-[#86868B]">PNG, JPG up to 5MB</span>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading || success}
              className="w-full min-h-[48px] text-sm font-semibold justify-center shadow-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {submissionStep === "analyzing"
                    ? "Evaluating AI advisory triage..."
                    : "Recording simulated report..."}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Submit Fault Report (Demo)
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
