"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "outline" | "ghost" | "destructive" | "link" | "sage";
type Size = "sm" | "default" | "lg" | "icon" | "pill";

const variants: Record<Variant, string> = {
  default: "bg-ink text-warm-50 hover:bg-warm-800 dark:bg-warm-50 dark:text-ink dark:hover:bg-white shadow-card",
  sage: "bg-sage-600 text-white hover:bg-sage-700 shadow-lg shadow-sage-600/25",
  secondary: "bg-sage-100 text-sage-700 hover:bg-sage-200 dark:bg-white/10 dark:text-warm-50",
  outline: "border border-warm-200 bg-white hover:border-sage-300 hover:bg-sage-50/40 dark:bg-transparent",
  ghost: "hover:bg-sage-50 text-warm-700 dark:hover:bg-white/5",
  destructive: "bg-red-600 text-white hover:bg-red-500",
  link: "text-sage-600 underline underline-offset-4 hover:text-sage-700",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  default: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  pill: "h-11 px-6 text-sm rounded-full",
  icon: "h-10 w-10",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400",
        "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
