"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveMatch } from "@/app/actions";

type Props = {
  topId: string | null;
  bottomId: string | null;
};

export default function SaveMatchButton({ topId, bottomId }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message?: string;
  }>({ type: "idle" });

  const disabled = !topId || !bottomId || status.type === "loading";

  const handleSave = async () => {
    if (!topId || !bottomId) return;

    setStatus({ type: "loading" });

    const result = await saveMatch(topId, bottomId);

    if (result.error) {
      setStatus({ type: "error", message: result.error });
      setTimeout(() => setStatus({ type: "idle" }), 2500);
    } else {
      setStatus({ type: "success", message: "Match saved" });
      router.refresh();
      setTimeout(() => setStatus({ type: "idle" }), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleSave}
        disabled={disabled}
        style={{ fontFamily: "var(--font-dm-mono)" }}
        className={`px-8 py-3 text-sm tracking-widest transition-colors ${
          disabled
            ? "bg-mono-200 text-mono-500 cursor-not-allowed"
            : status.type === "success"
              ? "bg-mono-900 text-white"
              : status.type === "error"
                ? "bg-white text-mono-900 border-2 border-mono-900"
                : "bg-mono-900 text-white hover:bg-mono-950"
        }`}
      >
        {status.type === "loading" ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            SAVING
          </span>
        ) : status.type === "success" ? (
          "SAVED"
        ) : status.type === "error" ? (
          status.message
        ) : (
          "SAVE MATCH"
        )}
      </button>
      {!topId || !bottomId ? (
        <p className="text-xs text-mono-500">
          Scroll to pick a top and bottom
        </p>
      ) : null}
    </div>
  );
}
