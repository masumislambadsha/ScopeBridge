"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-2xl bg-warm-200/70", className)} {...props} />;
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[2rem] border border-dashed border-warm-300 bg-white/60 px-6 py-12 text-center dark:bg-white/5">
      <p className="font-serif text-xl text-ink dark:text-warm-50">{title}</p>
      {hint && <p className="max-w-md text-sm leading-relaxed text-warm-600">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[2rem] border border-red-200 bg-red-50/60 px-6 py-10 text-center">
      <p className="font-serif text-xl text-red-900">Something went wrong</p>
      <p className="max-w-md text-sm text-red-600">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 active:scale-[0.98]">
          Retry
        </button>
      )}
    </div>
  );
}

export function ManualModeBanner({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-amber-300/70 bg-amber-50 p-5 sm:flex-row sm:items-center">
      <div className="flex-1">
        <p className="font-serif text-lg text-amber-900">AI unavailable — continue manually</p>
        <p className="text-sm text-amber-700">The AI job failed. Everything below works without AI; retry any time.</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="rounded-full border border-amber-400 bg-white px-5 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100">
          Retry AI
        </button>
      )}
    </div>
  );
}

export function AiDraftLabel() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
      <span className="h-1.5 w-1.5 rounded-full bg-purple-500" /> AI draft
    </span>
  );
}
