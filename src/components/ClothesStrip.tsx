"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { ClothingItem } from "@/lib/types";
import { resolveImageUrl } from "@/lib/imageUrl";
import NicknameTag from "./NicknameTag";

type Props = {
  items: ClothingItem[];
  category: "top" | "bottom";
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string, imageUrl: string) => void;
  onNicknameChange: (id: string, nickname: string | null) => Promise<void>;
};

export default function ClothesStrip({
  items,
  category,
  selectedId,
  onSelect,
  onToggleStatus,
  onDelete,
  onNicknameChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const label = category === "top" ? "Tops" : "Bottoms";
  const emptyMessage =
    category === "top" ? "No tops yet" : "No bottoms yet";

  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // IntersectionObserver to detect which card is centered
  useEffect(() => {
    const container = containerRef.current;
    if (!container || items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const id = entry.target.getAttribute("data-clothes-id");
            const status = entry.target.getAttribute("data-clothes-status");
            if (id && status === "available") onSelectRef.current(id);
          }
        }
      },
      {
        root: container,
        threshold: [0.6],
      }
    );

    cardRefs.current.forEach((el) => observer.observe(el));

    if (items.length === 1 && items[0].status === "available") {
      onSelectRef.current(items[0].id);
    }

    return () => observer.disconnect();
  }, [items]);

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
  }, [updateScrollState, items]);

  const scrollBy = (direction: "left" | "right") => {
    const container = containerRef.current;
    if (!container) return;
    const cardWidth = container.clientWidth;
    const delta = direction === "left" ? -cardWidth : cardWidth;
    container.scrollBy({ left: delta, behavior: "smooth" });
  };

  const setCardRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(id, el);
    } else {
      cardRefs.current.delete(id);
    }
  };

  if (items.length === 0) {
    return (
      <section className="w-full" aria-label={label}>
        <h2 className="label-caps mb-2.5">{label}</h2>
        <div className="flex items-center justify-center h-48 surface-empty">
          <p className="text-mono-500 text-sm">{emptyMessage}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full" aria-label={label}>
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="label-caps">{label}</h2>
        <span className="font-mono text-xs text-mono-500 tabular-nums tracking-wider">
          {items.length}
        </span>
      </div>

      <div className="relative group">
        <div
          ref={containerRef}
          className="scroll-strip surface-frame product-stage"
        >
          {items.map((item, index) => (
            <div
              key={item.id}
              ref={setCardRef(item.id)}
              data-clothes-id={item.id}
              data-clothes-status={item.status}
              className="scroll-card flex items-center justify-center p-5"
            >
              <div
                className={`relative flex flex-col items-center overflow-hidden transition-[box-shadow,outline-color] duration-300 outline outline-2 outline-offset-[-1px] bg-mono-0/40 ${
                  item.status === "unavailable"
                    ? "outline-mono-200"
                    : selectedId === item.id
                      ? "outline-mono-900 shadow-[3px_3px_0_0_color-mix(in_srgb,var(--color-mono-900)_12%,transparent)]"
                      : "outline-transparent"
                }`}
              >
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveImageUrl(item.image_url)}
                    alt={
                      item.nickname
                        ? `${item.nickname}${
                            item.status === "unavailable"
                              ? ", marked as laundry"
                              : ""
                          }`
                        : `${category} item ${index + 1}${
                            item.status === "unavailable"
                              ? ", marked as laundry"
                              : ""
                          }`
                    }
                    className={`h-64 w-auto max-w-full object-contain transition-all duration-300 ${
                      item.status === "unavailable"
                        ? "opacity-30 grayscale"
                        : ""
                    }`}
                    loading="lazy"
                  />

                  {item.status === "unavailable" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-mono text-xs tracking-widest text-mono-700 bg-mono-0/90 px-2.5 py-1 border border-mono-200">
                        WASH
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id, item.image_url);
                    }}
                    className="card-action touch-visible top-0 right-0 w-7 border-l border-b"
                    aria-label={
                      item.nickname
                        ? `Delete ${item.nickname}`
                        : `Delete ${category} item ${index + 1}`
                    }
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

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStatus(item.id);
                    }}
                    className={`card-action touch-visible bottom-0 left-0 px-2 border-r border-t font-mono text-xs tracking-wider ${
                      item.status === "available"
                        ? ""
                        : "!bg-mono-900 !text-mono-0 hover:!bg-mono-950"
                    }`}
                    aria-label={
                      item.status === "available"
                        ? "Mark as unavailable"
                        : "Mark as available"
                    }
                  >
                    {item.status === "available" ? "CLN" : "DRTY"}
                  </button>
                </div>

                <NicknameTag
                  nickname={item.nickname}
                  categoryLabel={category}
                  onSave={(next) => onNicknameChange(item.id, next)}
                />
              </div>
            </div>
          ))}
        </div>

        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollBy("left")}
            className="scroll-nav left-0 touch-visible"
            aria-label="Previous item"
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
            aria-label="Next item"
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
    </section>
  );
}
