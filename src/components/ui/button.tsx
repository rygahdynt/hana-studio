import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "ghost"
    | "destructive"
    | "link";
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "default", size = "default", disabled, ...props },
    ref,
  ) => {
    const variantStyles = {
      default:
        "bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:bg-blue-800/50",
      secondary:
        "bg-neutral-800 text-neutral-100 hover:bg-neutral-700 disabled:bg-neutral-800/50",
      outline:
        "border border-neutral-800 bg-transparent text-neutral-200 hover:bg-neutral-800/80 hover:text-white disabled:border-neutral-800/50",
      ghost:
        "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 disabled:text-neutral-600",
      destructive:
        "bg-red-600 text-white hover:bg-red-700 shadow-sm disabled:bg-red-800/50",
      link: "text-blue-400 underline-offset-4 hover:underline p-0 h-auto",
    };

    const sizeStyles = {
      default: "h-9 px-4 py-2 text-sm",
      sm: "h-8 px-3 text-xs",
      lg: "h-11 px-6 text-base",
      icon: "h-9 w-9 p-0",
      "icon-sm": "h-7 w-7 p-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
