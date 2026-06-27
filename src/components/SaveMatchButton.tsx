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
      setStatus({ type: "success", message: "Match saved!" });
      router.refresh();
      setTimeout(() => setStatus({ type: "idle" }), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleSave}
        disabled={disabled}
        className={`px-6 py-3 rounded-full text-white font-semibold transition-all text-lg ${
          disabled
            ? "bg-blossom-300 cursor-not-allowed"
            : status.type === "success"
              ? "bg-green-500"
              : status.type === "error"
                ? "bg-red-400"
                : "bg-blossom-500 hover:bg-blossom-600 active:scale-95 shadow-md hover:shadow-lg"
        }`}
      >
        {status.type === "loading" ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
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
            Saving...
          </span>
        ) : status.type === "success" ? (
          "Saved! ✨"
        ) : status.type === "error" ? (
          status.message
        ) : (
          "💝 Save This Match"
        )}
      </button>
      {!topId || !bottomId ? (
        <p className="text-xs text-blossom-400">
          Scroll through tops and bottoms to pick a combination
        </p>
      ) : null}
    </div>
  );
}
