"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * Billing-period toggle. Styled with the care-io palette (sage-600 fill,
 * warm thumb) and animated via the knob transition only — no Radix dep.
 */
export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400",
        checked ? "bg-sage-600" : "bg-warm-200",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-300",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  ),
);
Switch.displayName = "Switch";