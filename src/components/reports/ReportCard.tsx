"use client";

import React from "react";
import Image from "next/image";
import { FaultReport } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { MapPin, Calendar, ArrowRight, Image as ImageIcon } from "lucide-react";

interface ReportCardProps {
  report: FaultReport;
  onSelect: (report: FaultReport) => void;
}

export function ReportCard({ report, onSelect }: ReportCardProps) {
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
  });

  return (
    <div
      onClick={() => onSelect(report)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(report);
        }
      }}
      tabIndex={0}
      role="button"
      className="group relative bg-white rounded-2xl border border-[#E5E5EA] p-5 shadow-xs hover:border-[#0071E3]/40 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
    >
      {/* Left: Thumbnail & Equipment Info */}
      <div className="flex items-start sm:items-center gap-4 min-w-0 w-full sm:w-auto">
        {/* Thumbnail preview or icon */}
        <div className="relative w-14 h-14 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] overflow-hidden shrink-0 flex items-center justify-center text-[#86868B] group-hover:border-[#0071E3]/30 transition-colors">
          {report.imageUrl ? (
            <Image
              src={report.imageUrl}
              alt={report.equipmentName}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <ImageIcon className="w-6 h-6 text-[#86868B]" />
          )}
        </div>

        {/* Text details */}
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-[#1D1D1F] truncate group-hover:text-[#0071E3] transition-colors">
              {report.equipmentName}
            </h3>
            <span className="text-[11px] font-mono text-[#86868B] bg-[#F5F5F7] px-2 py-0.5 rounded-md border border-[#E5E5EA]">
              {report.assetId}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#656565]">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#0071E3] shrink-0" />
              <span className="truncate max-w-[200px]">{report.labName}</span>
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#86868B] shrink-0" />
              {formattedDate}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Badges & View Arrow */}
      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F5F5F7] shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant={getPriorityVariant(report.priority)} size="sm">
            {report.priority}
          </Badge>
          <Badge variant={getStatusVariant(report.status)} size="sm">
            {report.status}
          </Badge>
        </div>

        <span className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#86868B] group-hover:text-[#0071E3] group-hover:translate-x-0.5 transition-all">
          <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </div>
  );
}
