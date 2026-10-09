import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-warm-200/70 bg-white shadow-card dark:bg-[#161310]">
      <table className={cn("w-full min-w-[640px] text-left text-sm", className)} {...props} />
    </div>
  );
}

export function MobileCards<T>({ items, render }: { items: T[]; render: (item: T) => React.ReactNode }) {
  return <div className="grid gap-3 md:hidden">{items.map((item, i) => <React.Fragment key={i}>{render(item)}</React.Fragment>)}</div>;
}

export function PageHeader({ title, hint, actions }: { title: string; hint?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-2xl text-ink dark:text-warm-50 sm:text-[2rem] sm:leading-tight">{title}</h1>
        {hint && <p className="mt-1 text-[15px] text-warm-600 dark:text-warm-400">{hint}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Separator({ className }: { className?: string }) {
  return <div className={cn("my-4 h-px bg-warm-200/70", className)} />;
}
