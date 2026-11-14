import React from "react";

export default function Loading() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6" role="status" aria-live="polite">
      <div className="w-10 h-10 rounded-full border-3 border-[#E5E5EA] border-t-[#0071E3] animate-spin" />
      <p className="mt-4 text-sm font-medium text-[#656565]">
        Loading LabLens AI...
      </p>
      <span className="sr-only">Loading content</span>
    </div>
  );
}
