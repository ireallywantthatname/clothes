export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "clothes-theme";

export const THEMES: Theme[] = ["light", "dark", "system"];

/** Hang-tag labels — same voice as MIX / SAVED / CLN / DRTY */
export const THEME_LABELS: Record<Theme, string> = {
  light: "DAY",
  dark: "NITE",
  system: "AUTO",
};

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

export function readStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(raw)) return raw;
  } catch {
    // private mode / blocked storage
  }
  return "system";
}

export function writeStoredTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore write failures
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

export function nextTheme(current: Theme): Theme {
  const i = THEMES.indexOf(current);
  return THEMES[(i + 1) % THEMES.length];
}

/** Inline script: set data-theme before first paint (no FOUC). */
export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"&&t!=="system")t="system";document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme","system")}})()`;

// ── Client store (useSyncExternalStore) ──────────────────

const listeners = new Set<() => void>();

function emitThemeChange() {
  for (const listener of listeners) listener();
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY || e.key === null) listener();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function getThemeSnapshot(): Theme {
  return readStoredTheme();
}

/** SSR + hydration must match; boot script already set the real theme on <html>. */
export function getServerThemeSnapshot(): Theme {
  return "system";
}

export function setTheme(theme: Theme): void {
  writeStoredTheme(theme);
  applyTheme(theme);
  emitThemeChange();
}
