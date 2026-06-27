"use client";

import { useState } from "react";
import Link from "next/link";
import ClothesStrip from "./ClothesStrip";
import SaveMatchButton from "./SaveMatchButton";
import type { ClothingItem } from "@/lib/types";

type Props = {
  tops: ClothingItem[];
  bottoms: ClothingItem[];
};

export default function ClothesSlotMachine({ tops, bottoms }: Props) {
  const [selectedTopId, setSelectedTopId] = useState<string | null>(null);
  const [selectedBottomId, setSelectedBottomId] = useState<string | null>(null);

  const hasItems = tops.length > 0 || bottoms.length > 0;

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between w-full border-b border-mono-200 pb-4">
        <h1
          className="text-2xl font-medium text-mono-900 tracking-wider"
          style={{ fontFamily: "var(--font-dm-mono)" }}
        >
          LAZY BLOSSOM
        </h1>
        <Link
          href="/upload"
          className="px-4 py-2 bg-mono-900 text-white text-xs tracking-wider hover:bg-mono-950 transition-colors"
          style={{ fontFamily: "var(--font-dm-mono)" }}
        >
          + ADD
        </Link>
      </div>

      {!hasItems ? (
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
      ) : (
        <>
          {/* Tops strip */}
          <ClothesStrip
            items={tops}
            category="top"
            selectedId={selectedTopId}
            onSelect={setSelectedTopId}
          />

          {/* Connector */}
          <div className="flex items-center gap-4 w-full">
            <div className="flex-1 h-px bg-mono-200" />
            <span
              className="text-xs text-mono-500 tracking-wider"
              style={{ fontFamily: "var(--font-dm-mono)" }}
            >
              WITH
            </span>
            <div className="flex-1 h-px bg-mono-200" />
          </div>

          {/* Bottoms strip */}
          <ClothesStrip
            items={bottoms}
            category="bottom"
            selectedId={selectedBottomId}
            onSelect={setSelectedBottomId}
          />

          {/* Save button */}
          <SaveMatchButton
            topId={selectedTopId}
            bottomId={selectedBottomId}
          />
        </>
      )}
    </div>
  );
}
