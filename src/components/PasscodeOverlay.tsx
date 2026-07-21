"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { verifyPasscode } from "@/app/actions";
import { markJustUnlocked } from "./ContentReveal";

type Status = "idle" | "error" | "unlocking";

/**
 * Minimal hang-tag code entry over the locked closet silhouette.
 * Verifies server-side; on success fades out and refreshes so data can load.
 */
export default function PasscodeOverlay() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const formId = useId();
  const errorId = useId();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    // Focus after paint so the keyboard opens on mobile cleanly
    const t = window.setTimeout(() => inputRef.current?.focus(), 80);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = "";
    };
  }, []);

  const busy = pending || status === "unlocking";

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;

    setError(null);
    setStatus("idle");

    startTransition(async () => {
      const result = await verifyPasscode(code);
      if (!result.ok) {
        setError(result.error);
        setStatus("error");
        setShake(true);
        window.setTimeout(() => setShake(false), 420);
        inputRef.current?.select();
        return;
      }

      setStatus("unlocking");
      markJustUnlocked();
      // Let the overlay exit animation run before swapping to live data
      await new Promise((r) => window.setTimeout(r, 220));
      router.refresh();
    });
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 passcode-overlay ${
        status === "unlocking" ? "passcode-overlay-exit" : "animate-fade-in"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${formId}-title`}
      aria-describedby={`${formId}-desc`}
    >
      <div
        className="absolute inset-0 dialog-scrim"
        aria-hidden="true"
      />

      <div
        className={`relative w-full max-w-[17rem] bg-mono-0 border-2 border-mono-900 p-7 shadow-[4px_4px_0_0_color-mix(in_srgb,var(--color-mono-900)_18%,transparent)] ${
          status === "unlocking"
            ? "passcode-card-exit"
            : "animate-dialog-in opacity-0"
        } ${shake ? "passcode-shake" : ""}`}
      >
        <p className="label-caps text-center mb-3 tracking-[0.22em]">
          Locked
        </p>

        <h2
          id={`${formId}-title`}
          className="font-mono text-sm tracking-[0.18em] text-mono-900 text-center mb-2 text-balance"
        >
          ENTER CODE
        </h2>

        <p
          id={`${formId}-desc`}
          className="text-xs text-mono-500 text-center leading-relaxed mb-6 text-pretty"
        >
          Open the closet to mix outfits.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor={`${formId}-code`} className="sr-only">
              Passcode
            </label>
            <input
              ref={inputRef}
              id={`${formId}-code`}
              name="code"
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoCorrect="off"
              spellCheck={false}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (error) {
                  setError(null);
                  setStatus("idle");
                }
              }}
              disabled={busy}
              aria-invalid={status === "error"}
              aria-describedby={error ? errorId : undefined}
              className="field-input text-center tracking-[0.35em] text-base"
              placeholder="······"
            />
            {error && (
              <p
                id={errorId}
                role="alert"
                className="mt-2 font-mono text-[0.7rem] tracking-wider text-mono-700 text-center"
              >
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={busy || !code.trim()}
            className="btn-primary w-full py-3 text-xs tracking-[0.18em]"
          >
            {status === "unlocking"
              ? "OPENING…"
              : pending
                ? "CHECKING…"
                : "UNLOCK"}
          </button>
        </form>
      </div>
    </div>
  );
}
