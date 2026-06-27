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
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <h1 className="text-3xl font-bold text-blossom-700">🌸 Lazy Blossom</h1>
        <Link
          href="/upload"
          className="px-4 py-2 rounded-full bg-blossom-500 text-white text-sm font-semibold hover:bg-blossom-600 transition-colors shadow-sm"
        >
          + Add
        </Link>
      </div>

      {!hasItems ? (
        /* Empty state - nothing uploaded yet */
        <div className="flex flex-col items-center gap-4 py-16 w-full">
          <div className="text-6xl">👗</div>
          <h2 className="text-xl font-semibold text-blossom-600">
            Your closet is empty
          </h2>
          <p className="text-blossom-400 text-center max-w-xs">
            Upload photos of your clothes to start mixing and matching outfits!
          </p>
          <Link
            href="/upload"
            className="px-6 py-3 rounded-full bg-blossom-600 text-white font-semibold hover:bg-blossom-700 transition-colors shadow-md"
          >
            Add Your First Item
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

          {/* Connector hint */}
          <div className="text-blossom-300 text-2xl">+</div>

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
