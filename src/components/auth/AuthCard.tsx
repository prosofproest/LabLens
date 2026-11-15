import React from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="w-full max-w-md mx-auto py-10 px-4 sm:px-6">
      <div className="text-center mb-6 space-y-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#1D1D1F] hover:opacity-90 transition-opacity mb-2"
        >
          <div className="w-9 h-9 rounded-xl bg-[#0071E3] flex items-center justify-center text-white shadow-sm">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <span className="font-semibold text-lg tracking-tight">
            LabLens <span className="text-[#0071E3]">AI</span>
          </span>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1D1D1F]">
          {title}
        </h1>
        <p className="text-xs text-[#656565] leading-relaxed">
          {subtitle}
        </p>
      </div>

      <Card elevated className="p-7 sm:p-8 space-y-6">
        {children}
        {footer && (
          <div className="pt-4 border-t border-[#E5E5EA] text-center text-xs text-[#656565]">
            {footer}
          </div>
        )}
      </Card>
    </div>
  );
}
