"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    confirmRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      // Simple focus trap between the two actions
      if (e.key === "Tab") {
        const focusable = [cancelRef.current, confirmRef.current].filter(
          Boolean,
        ) as HTMLButtonElement[];
        if (focusable.length < 2) return;
        const first = focusable[0];
        const last = focusable[1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div
        className="absolute inset-0 dialog-scrim animate-fade-in"
        aria-hidden="true"
        onClick={onCancel}
      />

      <div className="relative w-full max-w-xs bg-mono-0 border-2 border-mono-900 p-8 opacity-0 animate-dialog-in shadow-[4px_4px_0_0_color-mix(in_srgb,var(--color-mono-900)_18%,transparent)]">
        <div className="flex justify-center mb-6">
          <div className="w-10 h-10 border-2 border-mono-900 flex items-center justify-center">
            <span
              className="font-mono text-lg text-mono-900"
              aria-hidden="true"
            >
              !
            </span>
          </div>
        </div>

        <h2
          id="confirm-dialog-title"
          className="font-mono text-sm tracking-widest text-mono-900 text-center mb-3 text-balance"
        >
          {title}
        </h2>

        <p
          id="confirm-dialog-message"
          className="text-sm text-mono-500 text-center leading-relaxed mb-8 text-pretty"
        >
          {message}
        </p>

        <div className="seg-track">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="seg-item seg-item-idle"
          >
            CANCEL
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="seg-item seg-item-active"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
