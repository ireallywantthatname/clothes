"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "./ConfirmDialog";
import NicknameTag from "./NicknameTag";
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
      <section className="w-full pt-5" aria-label="Saved matches">
        <h2 className="label-caps mb-3">Saved matches</h2>
        <div className="flex flex-col items-center justify-center gap-3 h-36 surface-empty px-6">
          <p className="text-mono-500 text-sm text-center text-pretty">
            No matches saved yet.
          </p>
          <p className="text-xs text-mono-300 text-center max-w-[16rem] leading-relaxed">
            Pair a top and bottom on Mix, then save the outfit here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full pt-5" aria-label="Saved matches">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="label-caps">Saved matches</h2>
        <span className="font-mono text-xs text-mono-500 tabular-nums tracking-wider">
          {matches.length}
        </span>
      </div>

      <div className="relative group">
        <div ref={containerRef} className="scroll-strip surface-frame">
          {matches.map((match, index) => (
            <div
              key={match.id}
              className="scroll-card relative flex flex-col"
            >
              {match.top && (
                <div className="h-56 flex flex-col items-center justify-center p-4 product-stage">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveImageUrl(match.top.image_url)}
                    alt={
                      match.top.nickname
                        ? match.top.nickname
                        : `Match ${index + 1} top`
                    }
                    className="max-h-[calc(100%-1.5rem)] w-auto max-w-full object-contain"
                    loading="lazy"
                  />
                  <NicknameTag
                    nickname={match.top.nickname}
                    className="mt-1 shrink-0 border-mono-200/80"
                  />
                </div>
              )}
              <div className="h-px bg-mono-200 shrink-0" />
              {match.bottom && (
                <div className="h-56 flex flex-col items-center justify-center p-4 product-stage">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveImageUrl(match.bottom.image_url)}
                    alt={
                      match.bottom.nickname
                        ? match.bottom.nickname
                        : `Match ${index + 1} bottom`
                    }
                    className="max-h-[calc(100%-1.5rem)] w-auto max-w-full object-contain"
                    loading="lazy"
                  />
                  <NicknameTag
                    nickname={match.bottom.nickname}
                    className="mt-1 shrink-0 border-mono-200/80"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => setPendingDelete(match.id)}
                className="card-action touch-visible top-0 right-0 w-7 border-l border-b"
                aria-label={`Delete match ${index + 1}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-3.5 h-3.5"
                  aria-hidden="true"
                >
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollBy("left")}
            className="scroll-nav left-0 touch-visible"
            aria-label="Previous match"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}

        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollBy("right")}
            className="scroll-nav right-0 touch-visible"
            aria-label="Next match"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
              aria-hidden="true"
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
    </section>
  );
}
