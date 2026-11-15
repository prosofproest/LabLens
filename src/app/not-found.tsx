import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white border border-[#E5E5EA] flex items-center justify-center text-[#0071E3] shadow-sm mb-5">
        <FileQuestion className="w-7 h-7" />
      </div>
      <span className="text-xs font-semibold text-[#0071E3] uppercase tracking-wider mb-2">
        Error 404
      </span>
      <h1 className="text-3xl font-semibold tracking-tight text-[#1D1D1F] mb-3">
        Page Not Found
      </h1>
      <p className="max-w-md text-sm text-[#656565] leading-relaxed mb-6">
        The requested page could not be located on the LabLens AI platform. Please check the URL or return to the main portal.
      </p>
      <Link href="/">
        <Button variant="primary" size="md">
          Return to Home
        </Button>
      </Link>
    </div>
  );
}

