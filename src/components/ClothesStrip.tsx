"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { ClothingItem } from "@/lib/types";
import { resolveImageUrl } from "@/lib/imageUrl";

type Props = {
  items: ClothingItem[];
  category: "top" | "bottom";
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string, imageUrl: string) => void;
};

export default function ClothesStrip({
  items,
  category,
  selectedId,
  onSelect,
  onToggleStatus,
  onDelete,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const label = category === "top" ? "TOPS" : "BOTTOMS";
  const emptyMessage =
    category === "top" ? "No tops yet" : "No bottoms yet";

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

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

  // Update scroll button states
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
      <div className="w-full">
        <h2
          className="text-xs tracking-widest text-mono-500 mb-2"
          style={{ fontFamily: "var(--font-dm-mono)" }}
        >
          {label}
        </h2>
        <div className="flex items-center justify-center h-48 bg-mono-100 border-2 border-mono-200">
          <p className="text-mono-500 text-sm">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <h2
          className="text-xs tracking-widest text-mono-500"
          style={{ fontFamily: "var(--font-dm-mono)" }}
        >
          {label}
        </h2>
        <span className="text-xs text-mono-500 tabular-nums">
          {items.length}
        </span>
      </div>

      <div className="relative group">
        {/* Scroll container */}
        <div
          ref={containerRef}
          className="scroll-strip bg-mono-100 border border-mono-200"
        >
          {items.map((item) => (
            <div
              key={item.id}
              ref={setCardRef(item.id)}
              data-clothes-id={item.id}
              data-clothes-status={item.status}
              className="scroll-card flex items-center justify-center p-4"
            >
              <div
                className={`relative overflow-hidden transition-[border-color] duration-300 border-2 ${
                  item.status === "unavailable"
                    ? "border-mono-200"
                    : selectedId === item.id
                      ? "border-mono-900"
                      : "border-transparent"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveImageUrl(item.image_url)}
                  alt={`${category} clothing item`}
                  className={`h-64 w-auto max-w-full object-contain transition-all duration-300 ${
                    item.status === "unavailable"
                      ? "opacity-30 grayscale"
                      : ""
                  }`}
                  loading="lazy"
                />

                {/* Unavailable overlay label */}
                {item.status === "unavailable" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className="text-xs tracking-widest text-mono-500 bg-white/80 px-2 py-1"
                      style={{ fontFamily: "var(--font-dm-mono)" }}
                    >
                      WASH
                    </span>
                  </div>
                )}

                {/* Delete button — top-right */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id, item.image_url);
                  }}
                  className="absolute top-0 right-0 w-7 h-7 bg-white border-l border-b border-mono-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-mono-100 touch-visible"
                  aria-label="Delete item"
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

                {/* Status toggle — bottom-left */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStatus(item.id);
                  }}
                  className={`absolute bottom-0 left-0 h-7 px-2 border-r border-t border-mono-200 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs tracking-wider touch-visible ${
                    item.status === "available"
                      ? "bg-white text-mono-500 hover:bg-mono-100"
                      : "bg-mono-900 text-white hover:bg-mono-950"
                  }`}
                  style={{ fontFamily: "var(--font-dm-mono)" }}
                  aria-label={
                    item.status === "available"
                      ? "Mark as unavailable"
                      : "Mark as available"
                  }
                >
                  {item.status === "available" ? "CLN" : "DRTY"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scrollBy("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-mono-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-mono-100"
            aria-label="Previous item"
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
            aria-label="Next item"
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
    </div>
  );
}
