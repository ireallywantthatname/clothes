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

  // Focus confirm button on open, handle Escape key
  useEffect(() => {
    if (!open) return;

    confirmRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  // Prevent body scroll while open
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
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-mono-900/40 opacity-0 animate-[fade-in_150ms_ease-out_forwards]"
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative w-full max-w-xs bg-white border-2 border-mono-900 p-8 opacity-0 scale-95 animate-[dialog-in_200ms_ease-out_forwards]">
        {/* Warning icon */}
        <div className="flex justify-center mb-6">
          <div className="w-10 h-10 border-2 border-mono-900 flex items-center justify-center">
            <span
              className="text-lg text-mono-900"
              style={{ fontFamily: "var(--font-dm-mono)" }}
            >
              !
            </span>
          </div>
        </div>

        {/* Title */}
        <h2
          className="text-sm tracking-widest text-mono-900 text-center mb-3"
          style={{ fontFamily: "var(--font-dm-mono)" }}
        >
          {title}
        </h2>

        {/* Message */}
        <p className="text-sm text-mono-500 text-center leading-relaxed mb-8">
          {message}
        </p>

        {/* Buttons */}
        <div className="flex gap-px bg-mono-200">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 text-xs tracking-wider bg-white text-mono-900 hover:bg-mono-100 transition-colors"
            style={{ fontFamily: "var(--font-dm-mono)" }}
          >
            CANCEL
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3 text-xs tracking-wider bg-mono-900 text-white hover:bg-mono-950 transition-colors"
            style={{ fontFamily: "var(--font-dm-mono)" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes dialog-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>,
    document.body,
  );
}
