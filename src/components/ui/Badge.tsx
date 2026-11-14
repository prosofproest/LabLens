import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "info" | "success" | "warning" | "critical";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "neutral",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const variants = {
    neutral: "bg-[#F3F4F6] text-[#656565] border border-[#E5E5EA]",
    info: "bg-[#EBF5FF] text-[#0071E3] border border-[#B9E1FF]",
    success: "bg-[#E8F5E9] text-[#248A3D] border border-[#C8E6C9]",
    warning: "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]",
    critical: "bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]",
  };

  const sizes = {
    sm: "px-2.5 py-0.5 text-[11px] leading-tight",
    md: "px-3 py-1 text-xs leading-normal",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full select-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
