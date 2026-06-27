"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMatch } from "@/app/actions";
import type { Match } from "@/lib/types";

type Props = {
  matches: Match[];
};

export default function MatchesList({ matches }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (matchId: string) => {
    setDeletingId(matchId);
    const result = await deleteMatch(matchId);
    if (result.success) {
      router.refresh();
    }
    setDeletingId(null);
  };

  if (matches.length === 0) {
    return (
      <div className="w-full mt-8">
        <h2 className="text-lg font-semibold text-blossom-700 mb-3">
          Saved Matches
        </h2>
        <div className="flex items-center justify-center h-32 bg-blossom-50 rounded-2xl border-2 border-dashed border-blossom-200">
          <p className="text-blossom-400 text-sm">
            No matches saved yet — find a combination you love and save it!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mt-8">
      <h2 className="text-lg font-semibold text-blossom-700 mb-3">
        Saved Matches ({matches.length})
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {matches.map((match) => (
          <div
            key={match.id}
            className="relative bg-white rounded-xl shadow-sm border border-blossom-100 overflow-hidden group"
          >
            <div className="flex flex-col">
              {/* Top image */}
              {match.top && (
                <div className="h-32 bg-blossom-50 flex items-center justify-center p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={match.top.image_url}
                    alt="Top"
                    className="h-full w-auto max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
              )}
              {/* Bottom image */}
              {match.bottom && (
                <div className="h-32 bg-blossom-50/50 flex items-center justify-center p-2 border-t border-blossom-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={match.bottom.image_url}
                    alt="Bottom"
                    className="h-full w-auto max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
              )}
            </div>

            {/* Delete button */}
            <button
              onClick={() => handleDelete(match.id)}
              disabled={deletingId === match.id}
              className="absolute top-1 right-1 w-7 h-7 rounded-full bg-white/90 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
              aria-label="Delete match"
            >
              {deletingId === match.id ? (
                <svg
                  className="animate-spin h-3 w-3 text-red-400"
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
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-3.5 h-3.5 text-red-400"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
