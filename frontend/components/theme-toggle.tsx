"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "rounded-xl p-2 text-warm-700 transition-colors hover:bg-sage-50 hover:text-sage-600 dark:text-warm-300 dark:hover:bg-white/5",
        className,
      )}
    >
      {theme === "dark" ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
    </button>
  );
}
