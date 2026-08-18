"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import ClothesSlotMachine from "./ClothesSlotMachine";
import MatchesList from "./MatchesList";
import ThemeToggle from "./ThemeToggle";
import HomeSkeleton from "./HomeSkeleton";
import { usePasscode } from "@/lib/passcode";

export default function HomeContent() {
  const { passcode } = usePasscode();
  const clothes = useQuery(
    api.clothes.list,
    passcode === null ? "skip" : { passcode },
  );
  const matches = useQuery(
    api.matches.list,
    passcode === null ? "skip" : { passcode },
  );
  const [tab, setTab] = useState<"mix" | "saved">("mix");

  if (clothes === undefined || matches === undefined) {
    return <HomeSkeleton />;
  }

  const { tops, bottoms } = clothes;
  const hasItems = tops.length > 0 || bottoms.length > 0;

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Sticky header + tabs */}
      <header className="sticky top-0 z-10 bg-mono-0/95 backdrop-blur-sm pt-4 -mt-1">
        <div className="flex items-end justify-between w-full border-b border-mono-200 pb-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-mono text-3xl font-medium text-mono-900 tracking-[0.22em] leading-none lowercase">
              clothes
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/upload"
              className="btn-primary px-4 py-2.5 text-xs tracking-wider"
            >
              + ADD
            </Link>
          </div>
        </div>

        {/* Tab bar */}
        <div className="seg-track" role="tablist" aria-label="Views">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "mix"}
            onClick={() => setTab("mix")}
            className={`seg-item ${
              tab === "mix" ? "seg-item-active" : "seg-item-idle"
            }`}
          >
            MIX
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "saved"}
            onClick={() => setTab("saved")}
            className={`seg-item ${
              tab === "saved" ? "seg-item-active" : "seg-item-idle"
            }`}
          >
            SAVED
            {matches.length > 0 && (
              <span
                className={`ml-1.5 tabular-nums text-[0.7rem] ${
                  tab === "saved" ? "text-mono-0/70" : "text-mono-300"
                }`}
              >
                {matches.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="pt-1">
        {tab === "mix" ? (
          hasItems ? (
            <ClothesSlotMachine tops={tops} bottoms={bottoms} />
          ) : (
            <section
              className="flex flex-col items-center gap-7 py-16 w-full"
              aria-label="Empty closet"
            >
              <div className="w-20 h-20 surface-empty flex items-center justify-center">
                <span className="font-mono text-xl text-mono-300 tracking-widest">
                  [ ]
                </span>
              </div>
              <div className="flex flex-col items-center gap-2.5">
                <h2 className="font-mono text-lg text-mono-900 tracking-[0.18em] text-balance">
                  CLOSET EMPTY
                </h2>
                <p className="text-sm text-mono-500 text-center max-w-xs leading-relaxed text-pretty">
                  Upload photos of your clothes to start mixing and matching
                  outfits.
                </p>
              </div>
              <Link
                href="/upload"
                className="btn-primary px-6 py-3 text-sm tracking-wider"
              >
                ADD FIRST ITEM
              </Link>
            </section>
          )
        ) : (
          <MatchesList matches={matches} />
        )}
      </div>
    </div>
  );
}
