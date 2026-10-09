"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-xl border border-warm-200 bg-white px-4 py-2 text-[15px]",
        "placeholder:text-warm-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400 focus-visible:border-sage-300",
        "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5 dark:border-white/10",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[96px] w-full rounded-2xl border border-warm-200 bg-white px-4 py-3 text-[15px] leading-relaxed",
        "placeholder:text-warm-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400",
        "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5 dark:border-white/10",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-semibold text-warm-800 dark:text-warm-200", className)} {...props} />;
}

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-xl border border-warm-200 bg-white px-3 text-[15px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400 dark:bg-white/5 dark:border-white/10",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-medium text-red-600">{message}</p>;
}
