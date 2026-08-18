"use client";

import { type ReactNode, useState } from "react";

const JUST_UNLOCKED_KEY = "clothes-just-unlocked";

/** Mark that the next paint should run the unlock → content reveal. */
export function markJustUnlocked(): void {
  try {
    sessionStorage.setItem(JUST_UNLOCKED_KEY, "1");
  } catch {
    // private mode
  }
}

/**
 * Soft rise-in only after a successful unlock (not on ordinary navigations).
 */
export default function ContentReveal({ children }: { children: ReactNode }) {
  const [animate] = useState(() => {
    try {
      if (sessionStorage.getItem(JUST_UNLOCKED_KEY) === "1") {
        sessionStorage.removeItem(JUST_UNLOCKED_KEY);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  });

  return (
    <div className={animate ? "animate-content-reveal" : undefined}>
      {children}
    </div>
  );
}
