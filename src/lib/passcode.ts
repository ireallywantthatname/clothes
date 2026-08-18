"use client";

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";

const STORAGE_KEY = "clothes-unlocked";
const MAX_AGE_MS = 60 * 60 * 24 * 30 * 1000;

type Stored = { code: string; exp: number };

type PasscodeContextValue = {
  passcode: string | null;
  hydrating: boolean;
  unlock: (
    code: string,
  ) => Promise<{ ok: true; code: string } | { ok: false; error: string }>;
  reveal: (code: string) => void;
};

const PasscodeContext = createContext<PasscodeContextValue | null>(null);

function readStored(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed?.code || typeof parsed.exp !== "number") return null;
    if (Date.now() > parsed.exp) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.code;
  } catch {
    return null;
  }
}

function writeStored(code: string): void {
  try {
    const payload: Stored = { code, exp: Date.now() + MAX_AGE_MS };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
}

function clearStored(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}

export function PasscodeProvider({ children }: { children: ReactNode }) {
  const convex = useConvex();
  const [passcode, setPasscode] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const stored = readStored();
      const candidate = stored ?? "";
      try {
        const result = await convex.query(api.passcode.verifyPasscode, {
          passcode: candidate,
        });
        if (cancelled) return;
        if (result.ok) {
          setPasscode(candidate);
        } else {
          clearStored();
          setPasscode(null);
        }
      } catch {
        if (cancelled) return;
        setPasscode(null);
      } finally {
        if (!cancelled) setHydrating(false);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [convex]);

  const value = useMemo<PasscodeContextValue>(
    () => ({
      passcode,
      hydrating,
      unlock: async (code: string) => {
        const trimmed = code.trim();
        const result = await convex.query(api.passcode.verifyPasscode, {
          passcode: trimmed,
        });
        if (!result.ok) return result;
        writeStored(trimmed);
        return { ok: true as const, code: trimmed };
      },
      reveal: (code: string) => {
        setPasscode(code);
      },
    }),
    [convex, hydrating, passcode],
  );

  return createElement(PasscodeContext.Provider, { value }, children);
}

export function usePasscode(): PasscodeContextValue {
  const ctx = useContext(PasscodeContext);
  if (!ctx) {
    throw new Error("usePasscode must be used within PasscodeProvider");
  }
  return ctx;
}
