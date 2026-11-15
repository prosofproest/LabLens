"use client";

import React from "react";
import { DemoProvider } from "@/context/DemoContext";
import { DemoBanner } from "@/components/demo/DemoBanner";

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoProvider>
      <div className="min-h-[calc(100vh-14rem)] flex flex-col">
        <DemoBanner />
        <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </div>
    </DemoProvider>
  );
}

