"use client";

import { useSyncExternalStore } from "react";
import {
  THEME_LABELS,
  getServerThemeSnapshot,
  getThemeSnapshot,
  nextTheme,
  setTheme,
  subscribeTheme,
} from "@/lib/theme";

/**
 * Cycles DAY → NITE → AUTO. Same mono hang-tag voice as the rest of the UI.
 * Page colors never flash: a boot script sets data-theme before paint.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  const label = THEME_LABELS[theme];

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme(theme))}
      className={`font-mono text-xs tracking-[0.14em] text-mono-500 hover:text-mono-900 border border-mono-200 hover:border-mono-500 px-2.5 py-2 transition-[color,border-color,background-color] duration-200 btn-press ${className}`}
      aria-label={`Color mode: ${label}. Click to switch.`}
      title={`Mode: ${label}`}
    >
      {label}
    </button>
  );
}
