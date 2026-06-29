"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "./ConfirmDialog";
import { deleteMatch } from "@/app/actions";
import type { Match } from "@/lib/types";

type Props = {
  matches: Match[];
};

export default function MatchesList({ matches }: Props) {
  const router = useRouter();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  if (matches.length === 0) {
    return (
      <div className="w-full mt-10">
        <h2
          className="text-xs tracking-widest text-mono-500 mb-3"
          style={{ fontFamily: "var(--font-dm-mono)" }}
        >
          SAVED MATCHES
        </h2>
        <div className="flex items-center justify-center h-32 bg-mono-100 border-2 border-mono-200">
          <p className="text-mono-500 text-sm">
            No matches saved yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mt-10">
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-xs tracking-widest text-mono-500"
          style={{ fontFamily: "var(--font-dm-mono)" }}
        >
          SAVED MATCHES
        </h2>
        <span className="text-xs text-mono-500 tabular-nums">
          {matches.length}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-mono-200">
        {matches.map((match) => (
          <div
            key={match.id}
            className="relative bg-white overflow-hidden group"
          >
            <div className="flex flex-col">
              {/* Top image */}
              {match.top && (
                <div className="h-32 bg-mono-100 flex items-center justify-center p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/uploads/${match.top.image_url}`}
                    alt="Top"
                    className="h-full w-auto max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
              )}
              {/* Divider */}
              <div className="h-px bg-mono-200" />
              {/* Bottom image */}
              {match.bottom && (
                <div className="h-32 bg-white flex items-center justify-center p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/uploads/${match.bottom.image_url}`}
                    alt="Bottom"
                    className="h-full w-auto max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
              )}
            </div>

            {/* Delete button */}
            <button
              onClick={() => setPendingDelete(match.id)}
              className="absolute top-0 right-0 w-7 h-7 bg-white border-l border-b border-mono-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-mono-100 touch-visible"
              aria-label="Delete match"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-3.5 h-3.5 text-mono-500"
              >
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="REMOVE MATCH?"
        message="This outfit combination will be removed from your saved matches."
        confirmLabel="REMOVE"
        onConfirm={async () => {
          if (!pendingDelete) return;
          await deleteMatch(pendingDelete);
          router.refresh();
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
