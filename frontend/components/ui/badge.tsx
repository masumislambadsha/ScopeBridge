import * as React from "react";
import { cn } from "@/lib/utils";

const colors: Record<string, string> = {
  gray: "bg-warm-100 text-warm-700 border-warm-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-green-50 text-green-700 border-green-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
};

export function Badge({ color = "gray", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { color?: keyof typeof colors }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", colors[color], className)}
      {...props}
    />
  );
}

const STATUS_COLORS: Record<string, "gray" | "blue" | "green" | "amber" | "red" | "purple"> = {
  DRAFT: "gray",
  NEEDS_CLARIFICATION: "amber",
  READY: "blue",
  APPROVED: "green",
  REJECTED: "red",
  CHANGES_REQUESTED: "amber",
  PENDING: "amber",
  PENDING_APPROVAL: "amber",
  UNDER_REVIEW: "blue",
  SUPERSEDED: "gray",
  IMPLEMENTED: "green",
  TODO: "gray",
  IN_PROGRESS: "blue",
  REVIEW: "purple",
  COMPLETED: "green",
  SENT: "blue",
  ANSWERED: "green",
  CLOSED: "gray",
  PROCESSING: "blue",
  EXTRACTED: "green",
  AI_FAILED: "red",
  ACTIVE: "green",
  INACTIVE: "gray",
  ARCHIVED: "gray",
  PLANNING: "gray",
  ON_HOLD: "amber",
  CANCELLED: "red",
  IN_SCOPE: "green",
  OUT_OF_SCOPE: "red",
  POSSIBLY_RELATED: "amber",
  NOT_REQUIRED: "gray",
  RECEIVED: "blue",
  QUEUED: "gray",
  FAILED: "red",
  NONE: "gray",
  AI_DRAFT: "purple",
  REVIEWED: "green",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge color={STATUS_COLORS[status] ?? "gray"} className={className}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
