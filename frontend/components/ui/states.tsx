"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-zinc-200", className)} {...props} />;
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-10 text-center">
      <p className="font-medium text-zinc-800">{title}</p>
      {hint && <p className="max-w-md text-sm text-zinc-500">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-6 py-8 text-center">
      <p className="font-medium text-red-800">Something went wrong</p>
      <p className="max-w-md text-sm text-red-600">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-1 rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500">
          Retry
        </button>
      )}
    </div>
  );
}

export function ManualModeBanner({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center">
      <div className="flex-1">
        <p className="font-medium text-amber-900">AI unavailable — continue manually</p>
        <p className="text-sm text-amber-700">The AI job failed. Everything below works without AI; retry any time.</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="rounded-md border border-amber-400 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100">
          Retry AI
        </button>
      )}
    </div>
  );
}

export function AiDraftLabel() {
  return (
    <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
      AI draft
    </span>
  );
}
