"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { FaultReport } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { X, Calendar, MapPin, Tag, Wrench, User } from "lucide-react";

interface ReportDetailModalProps {
  report: FaultReport | null;
  onClose: () => void;
}

export function ReportDetailModal({ report, onClose }: ReportDetailModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!report) return null;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Resolved":
        return "success";
      case "In-Progress":
      case "Assigned":
      case "In-Review":
        return "warning";
      case "Cancelled":
        return "critical";
      default:
        return "info";
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "Critical":
        return "critical";
      case "High":
        return "warning";
      case "Medium":
        return "info";
      default:
        return "neutral";
    }
  };

  const formattedDate = new Date(report.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl border border-[#E5E5EA] shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-[#E5E5EA] flex items-center justify-between gap-4 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-[#86868B]">
              #{report.assetId}
            </span>
            <Badge variant={getStatusVariant(report.status)} size="sm">
              {report.status}
            </Badge>
            <Badge variant={getPriorityVariant(report.priority)} size="sm">
              {report.priority}
            </Badge>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors flex items-center justify-center"
            aria-label="Close details modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Title & Location */}
          <div className="space-y-2">
            <h2 id="report-modal-title" className="text-xl font-semibold text-[#1D1D1F] leading-snug">
              {report.equipmentName}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#656565]">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#0071E3]" />
                {report.labName}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#86868B]" />
                {formattedDate}
              </span>
            </div>
          </div>

          {/* Attached Photo */}
          {report.imageUrl && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">
                Malfunction Visual Evidence
              </span>
              <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-[#F5F5F7] border border-[#E5E5EA]">
                <Image
                  src={report.imageUrl}
                  alt={`Defect photo for ${report.equipmentName}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">
              Detailed Symptoms
            </span>
            <div className="p-4 rounded-2xl bg-[#FAFAFC] border border-[#E5E5EA] text-xs text-[#1D1D1F] leading-relaxed whitespace-pre-wrap">
              {report.description}
            </div>
          </div>

          {/* Status & Maintenance Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] space-y-1">
              <span className="text-[11px] font-semibold text-[#86868B] flex items-center gap-1">
                <Wrench className="w-3 h-3 text-[#0071E3]" /> Assigned Technician
              </span>
              <p className="font-medium text-[#1D1D1F]">
                {report.assignedTechnician || "Awaiting Technician Dispatch"}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] space-y-1">
              <span className="text-[11px] font-semibold text-[#86868B] flex items-center gap-1">
                <User className="w-3 h-3 text-[#0071E3]" /> Reported By
              </span>
              <p className="font-medium text-[#1D1D1F] truncate">
                {report.reportedBy.name}
              </p>
            </div>
          </div>

          {/* Admin Notes if any */}
          {report.adminNotes && (
            <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-xs space-y-1 text-[#1E40AF]">
              <span className="text-[11px] font-semibold flex items-center gap-1">
                <Tag className="w-3 h-3" /> Lab Supervisor / Admin Note
              </span>
              <p className="leading-relaxed">{report.adminNotes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#FAFAFC] border-t border-[#E5E5EA] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-white border border-[#E5E5EA] text-xs font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
