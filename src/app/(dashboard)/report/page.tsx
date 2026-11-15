import React from "react";
import { ReportFaultForm } from "@/components/reports/ReportFaultForm";

export const metadata = {
  title: "Report Fault — LabLens AI",
  description: "Submit laboratory equipment malfunction tickets for technician resolution.",
};

export default function ReportPage() {
  return (
    <div className="py-4">
      <ReportFaultForm />
    </div>
  );
}

