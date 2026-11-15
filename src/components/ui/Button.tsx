import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonStyleProps {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: ButtonStyleProps = {}) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-colors duration-150 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer min-h-[44px] min-w-[44px]";

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
    sm: "text-xs px-4 py-2 gap-1.5",
    md: "text-sm px-5 py-2.5 gap-2",
    lg: "text-base px-6 py-3 gap-2.5 min-h-[48px]",
  };

  return cn(baseStyles, variants[variant], sizes[size], className);
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonStyleProps {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonStyles({ variant, size, className })}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
