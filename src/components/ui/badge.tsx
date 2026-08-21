import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-blue-600/20 text-blue-400 border-blue-500/30",
    secondary: "bg-neutral-800 text-neutral-300 border-neutral-700",
    outline: "border-neutral-700 text-neutral-300",
    success: "bg-emerald-950/60 text-emerald-400 border-emerald-800/40",
    warning: "bg-amber-950/60 text-amber-400 border-amber-800/40",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide transition-colors uppercase",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
