import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, "-")}`;

    return (
      <div className="space-y-1.5 w-full text-left">
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white text-sm text-[#1D1D1F] border border-[#E5E5EA] transition-colors",
            "placeholder:text-[#86868B]",
            "focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/15",
            error && "border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/15",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-[#DC2626] font-medium">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-xs text-[#86868B]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

