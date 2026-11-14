import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors duration-150 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer";

    const variants = {
      primary:
        "bg-[#0071E3] text-white hover:bg-[#0077ED] active:scale-[0.99] shadow-sm",
      secondary:
        "bg-white text-[#1D1D1F] border border-[#E5E5EA] hover:bg-[#F5F5F7] active:scale-[0.99] shadow-sm",
      outline:
        "bg-transparent text-[#1D1D1F] border border-[#E5E5EA] hover:bg-white hover:border-[#D1D1D6]",
      ghost:
        "bg-transparent text-[#656565] hover:text-[#1D1D1F] hover:bg-black/[0.04]",
    };

    const sizes = {
      sm: "text-xs px-3.5 py-1.5 gap-1.5 h-8",
      md: "text-sm px-5 py-2.5 gap-2 h-10",
      lg: "text-base px-6 py-3 gap-2.5 h-12",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
