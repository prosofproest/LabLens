import React from "react";
import { APPROVED_DEPARTMENTS, Department } from "@/types";
import { cn } from "@/lib/utils";

interface DepartmentSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  value: Department | "";
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export function DepartmentSelect({
  label,
  error,
  value,
  onChange,
  className,
  id,
  ...props
}: DepartmentSelectProps) {
  const selectId = id || "department-select";

  return (
    <div className="space-y-1.5 w-full text-left">
      <label
        htmlFor={selectId}
        className="block text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider"
      >
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={onChange}
        className={cn(
          "w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white text-sm text-[#1D1D1F] border border-[#E5E5EA] transition-colors cursor-pointer",
          "focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/15",
          error && "border-[#DC2626] focus:border-[#DC2626]",
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...props}
      >
        <option value="" disabled>
          Select your engineering department
        </option>
        {APPROVED_DEPARTMENTS.map((dept) => (
          <option key={dept} value={dept}>
            {dept}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${selectId}-error`} className="text-xs text-[#DC2626] font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
