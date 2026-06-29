"use client";

import { useState } from "react";
import Link from "next/link";
import ClothesSlotMachine from "./ClothesSlotMachine";
import MatchesList from "./MatchesList";
import type { ClothingItem, Match } from "@/lib/types";

type Props = {
  tops: ClothingItem[];
  bottoms: ClothingItem[];
  matches: Match[];
};

export default function HomeContent({ tops, bottoms, matches }: Props) {
  const [tab, setTab] = useState<"mix" | "saved">("mix");
  const hasItems = tops.length > 0 || bottoms.length > 0;

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Sticky header + tabs */}
      <div className="sticky top-0 z-10 bg-mono-0 pt-4 -mt-4">
        {/* Header */}
        <div className="flex items-center justify-between w-full border-b border-mono-200 pb-4">
          <h1
            className="text-2xl font-medium text-mono-900 tracking-wider"
            style={{ fontFamily: "var(--font-dm-mono)" }}
          >
            CLOTHES
          </h1>
          <Link
            href="/upload"
            className="px-4 py-2 bg-mono-900 text-white text-xs tracking-wider hover:bg-mono-950 transition-colors"
            style={{ fontFamily: "var(--font-dm-mono)" }}
          >
            + ADD
          </Link>
        </div>

        {/* Tab bar */}
        <div className="flex gap-px bg-mono-200">
          <button
            onClick={() => setTab("mix")}
            className={`flex-1 py-3 text-sm tracking-wider transition-colors ${
              tab === "mix"
                ? "bg-mono-900 text-white"
                : "bg-white text-mono-500 hover:bg-mono-100"
            }`}
            style={{ fontFamily: "var(--font-dm-mono)" }}
          >
            MIX
          </button>
          <button
            onClick={() => setTab("saved")}
            className={`flex-1 py-3 text-sm tracking-wider transition-colors ${
              tab === "saved"
                ? "bg-mono-900 text-white"
                : "bg-white text-mono-500 hover:bg-mono-100"
            }`}
            style={{ fontFamily: "var(--font-dm-mono)" }}
          >
            SAVED
          </button>
        </div>
      </div>

      {/* Content */}
      {tab === "mix" ? (
        hasItems ? (
          <ClothesSlotMachine tops={tops} bottoms={bottoms} />
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center gap-6 py-20 w-full">
            <div className="w-16 h-16 border-2 border-mono-200 flex items-center justify-center">
              <span
                className="text-2xl text-mono-500"
                style={{ fontFamily: "var(--font-dm-mono)" }}
              >
                [ ]
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <h2
                className="text-lg text-mono-900 tracking-wide"
                style={{ fontFamily: "var(--font-dm-mono)" }}
              >
                CLOSET EMPTY
              </h2>
              <p className="text-sm text-mono-500 text-center max-w-xs">
                Upload photos of your clothes to start mixing and matching
                outfits.
              </p>
            </div>
            <Link
              href="/upload"
              className="px-6 py-3 bg-mono-900 text-white text-sm tracking-wider hover:bg-mono-950 transition-colors"
              style={{ fontFamily: "var(--font-dm-mono)" }}
            >
              ADD FIRST ITEM
            </Link>
          </div>
        )
      ) : (
        <MatchesList matches={matches} />
      )}
    </div>
  );
}
