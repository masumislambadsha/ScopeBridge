"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function Dialog({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "max-h-[90vh] w-full overflow-y-auto rounded-t-[2rem] border border-warm-200/70 bg-warm-50 p-6 shadow-soft sm:rounded-[2rem] sm:p-8 dark:bg-[#161310]",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
          "animate-scale-in",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 font-serif text-2xl text-ink dark:text-warm-50">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  danger,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      {body && <p className="mb-5 text-[15px] leading-relaxed text-warm-600">{body}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={danger ? "destructive" : "sage"}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: Array<{ id: string; label: string }>; active: string; onChange: (id: string) => void }) {
  return (
    <div className="scrollbar-hide flex gap-1 overflow-x-auto rounded-full border border-warm-200/70 bg-white/70 p-1.5 backdrop-blur dark:bg-white/5" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={t.id === active}
          onClick={() => onChange(t.id)}
          className={cn(
            "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400",
            t.id === active ? "bg-sage-600 text-white shadow-lg shadow-sage-600/25" : "text-warm-600 hover:bg-sage-50 hover:text-sage-700",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
