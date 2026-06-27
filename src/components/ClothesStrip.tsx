"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { ClothingItem } from "@/lib/types";

type Props = {
  items: ClothingItem[];
  category: "top" | "bottom";
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export default function ClothesStrip({
  items,
  category,
  selectedId,
  onSelect,
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
            if (id) onSelectRef.current(id);
          }
        }
      },
      {
        root: container,
        threshold: [0.6],
      }
    );

    cardRefs.current.forEach((el) => observer.observe(el));

    if (items.length === 1) {
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
              className="scroll-card flex items-center justify-center p-4"
            >
              <div
                className={`relative overflow-hidden transition-[border-color] duration-300 border-2 ${
                  selectedId === item.id
                    ? "border-mono-900"
                    : "border-transparent"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image_url}
                  alt={`${category} clothing item`}
                  className="h-64 w-auto max-w-full object-contain"
                  loading="lazy"
                />
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
