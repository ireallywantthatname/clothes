"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "./ConfirmDialog";
import { deleteMatch } from "@/app/actions";
import type { Match } from "@/lib/types";
import { resolveImageUrl } from "@/lib/imageUrl";

type Props = {
  matches: Match[];
};

export default function MatchesList({ matches }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const updateScrollState = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 1);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    );
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    updateScrollState();
    container.addEventListener("scroll", updateScrollState, { passive: true });
    return () => container.removeEventListener("scroll", updateScrollState);
  }, [updateScrollState, matches]);

  const scrollBy = (direction: "left" | "right") => {
    const container = containerRef.current;
    if (!container) return;
    const cardWidth = container.clientWidth;
    const delta = direction === "left" ? -cardWidth : cardWidth;
    container.scrollBy({ left: delta, behavior: "smooth" });
  };

  if (matches.length === 0) {
    return (
      <div className="w-full pt-4">
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
    <div className="w-full pt-4">
      <div className="flex items-center justify-between mb-2">
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

      <div className="relative group">
        {/* Scroll container */}
        <div
          ref={containerRef}
          className="scroll-strip bg-mono-100 border border-mono-200"
        >
          {matches.map((match) => (
            <div key={match.id} className="scroll-card flex flex-col">
              {/* Top image */}
              {match.top && (
                <div className="h-56 flex items-center justify-center p-4 bg-mono-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveImageUrl(match.top.image_url)}
                    alt="Top"
                    className="max-h-full w-auto max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
              )}
              {/* Divider */}
              <div className="h-px bg-mono-200 shrink-0" />
              {/* Bottom image */}
              {match.bottom && (
                <div className="h-56 flex items-center justify-center p-4 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveImageUrl(match.bottom.image_url)}
                    alt="Bottom"
                    className="max-h-full w-auto max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
              )}

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

        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scrollBy("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-mono-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-mono-100"
            aria-label="Previous match"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5 text-mono-900"
            >
              <path
                fillRule="evenodd"
                d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scrollBy("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-mono-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-mono-100"
            aria-label="Next match"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5 text-mono-900"
            >
              <path
                fillRule="evenodd"
                d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
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
