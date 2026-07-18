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
    <div className="flex flex-col items-center gap-3 pt-1">
      <button
        type="button"
        onClick={handleSave}
        disabled={disabled}
        className={`px-8 py-3 text-sm tracking-widest font-mono transition-[background-color,color,border-color,transform] duration-200 ${
          disabled
            ? "bg-mono-200 text-mono-500 cursor-not-allowed"
            : status.type === "success"
              ? "bg-mono-900 text-mono-0"
              : status.type === "error"
                ? "bg-mono-0 text-mono-900 border-2 border-mono-900"
                : "btn-primary"
        } ${!disabled ? "active:scale-[0.98] active:translate-y-px" : ""}`}
      >
        {status.type === "loading" ? (
          <span className="flex items-center gap-2">
            <span
              className="inline-block h-3.5 w-3.5 border border-mono-0/40 border-t-mono-0 rounded-full animate-spin"
              aria-hidden="true"
            />
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
        <p className="text-xs text-mono-500 text-center text-pretty">
          Scroll to pick a top and bottom
        </p>
      ) : null}
    </div>
  );
}
