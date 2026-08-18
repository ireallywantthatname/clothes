"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type FocusEvent,
} from "react";
import type { ClothingItem } from "@/lib/types";
import type { Id } from "../../convex/_generated/dataModel";
import NicknameTag from "./NicknameTag";

/** Dwell time on each piece while auto-scrolling (idle carousel). */
const AUTO_SCROLL_INTERVAL_MS = 4200;
/** After the user stops interacting, wait this long before resuming. */
const AUTO_SCROLL_RESUME_MS = 5500;

type AutoScrollDirection = "forward" | "backward";

type Props = {
  items: ClothingItem[];
  category: "top" | "bottom";
  selectedId: Id<"clothes"> | null;
  onSelect: (id: Id<"clothes"> | null) => void;
  onToggleStatus: (id: Id<"clothes">) => void;
  onDelete: (id: Id<"clothes">) => void;
  onNicknameChange: (id: Id<"clothes">, nickname: string | null) => Promise<void>;
  /**
   * Idle carousel direction. Tops and bottoms should use opposite values
   * so the racks counter-scroll when left alone.
   */
  autoScrollDirection?: AutoScrollDirection;
  /** Stagger start so paired racks don't tick in lockstep. */
  autoScrollOffsetMs?: number;
  /** Hard pause (e.g. confirm dialog open). */
  autoScrollPaused?: boolean;
};

export default function ClothesStrip({
  items,
  category,
  selectedId,
  onSelect,
  onToggleStatus,
  onDelete,
  onNicknameChange,
  autoScrollDirection,
  autoScrollOffsetMs = 0,
  autoScrollPaused = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  /** True while pointer/focus/touch is actively on this rack. */
  const [userHolding, setUserHolding] = useState(false);
  /** True briefly after a manual scroll/nav so auto-scroll waits. */
  const [userCooldown, setUserCooldown] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Skip treating programmatic scrolls as user interaction. */
  const programmaticScrollRef = useRef(false);

  const label = category === "top" ? "Tops" : "Bottoms";
  const emptyMessage =
    category === "top" ? "No tops yet" : "No bottoms yet";

  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const onVisibility = () => setPageVisible(document.visibilityState === "visible");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // IntersectionObserver to detect which card is centered
  useEffect(() => {
    const container = containerRef.current;
    if (!container || items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const id = entry.target.getAttribute("data-clothes-id") as
              | Id<"clothes">
              | null;
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

  const markUserScroll = useCallback(() => {
    if (programmaticScrollRef.current) return;
    setUserCooldown(true);
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = setTimeout(() => {
      setUserCooldown(false);
      cooldownTimerRef.current = null;
    }, AUTO_SCROLL_RESUME_MS);
  }, []);

  const getCardWidth = useCallback(() => {
    const container = containerRef.current;
    if (!container) return 0;
    return container.clientWidth;
  }, []);

  const getCurrentIndex = useCallback(() => {
    const container = containerRef.current;
    const width = getCardWidth();
    if (!container || width <= 0) return 0;
    return Math.round(container.scrollLeft / width);
  }, [getCardWidth]);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const container = containerRef.current;
      const width = getCardWidth();
      if (!container || width <= 0) return;
      const clamped = Math.max(0, Math.min(items.length - 1, index));
      programmaticScrollRef.current = true;
      container.scrollTo({ left: clamped * width, behavior });
      // Hold the flag through the smooth-scroll settle so residual events
      // don't look like user input.
      window.setTimeout(
        () => {
          programmaticScrollRef.current = false;
          updateScrollState();
        },
        behavior === "smooth" ? 500 : 80,
      );
    },
    [getCardWidth, items.length, updateScrollState],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    updateScrollState();

    const onScroll = () => {
      updateScrollState();
      markUserScroll();
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [updateScrollState, markUserScroll, items]);

  // Counter-scroll racks start at opposite ends of the closet.
  useEffect(() => {
    if (autoScrollDirection !== "backward" || items.length < 2) return;
    const id = window.requestAnimationFrame(() => {
      scrollToIndex(items.length - 1, "auto");
    });
    return () => window.cancelAnimationFrame(id);
    // Only on mount / direction or length change — not every scrollToIndex identity flip
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScrollDirection, items.length]);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, []);

  const scrollBy = (direction: "left" | "right") => {
    markUserScroll();
    const current = getCurrentIndex();
    scrollToIndex(
      direction === "left" ? current - 1 : current + 1,
      prefersReducedMotion ? "auto" : "smooth",
    );
  };

  const advanceCarousel = useCallback(() => {
    if (!autoScrollDirection || items.length < 2) return;
    const n = items.length;
    const current = getCurrentIndex();
    const step = autoScrollDirection === "forward" ? 1 : -1;
    let next = current + step;
    let behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth";

    // Wrap at the ends with an instant jump so we don't glide through every card.
    if (next >= n) {
      next = 0;
      behavior = "auto";
    } else if (next < 0) {
      next = n - 1;
      behavior = "auto";
    }

    scrollToIndex(next, behavior);
  }, [
    autoScrollDirection,
    getCurrentIndex,
    items.length,
    prefersReducedMotion,
    scrollToIndex,
  ]);

  // Idle auto-scroll: opposite racks counter-rotate when the user leaves them alone.
  useEffect(() => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }

    const shouldRun =
      !!autoScrollDirection &&
      items.length >= 2 &&
      !autoScrollPaused &&
      !userHolding &&
      !userCooldown &&
      !prefersReducedMotion &&
      pageVisible;

    if (!shouldRun) return;

    let cancelled = false;

    const schedule = (delay: number) => {
      autoTimerRef.current = setTimeout(() => {
        if (cancelled) return;
        advanceCarousel();
        schedule(AUTO_SCROLL_INTERVAL_MS);
      }, delay);
    };

    // First tick waits interval + stagger so both racks don't jump on mount.
    schedule(AUTO_SCROLL_INTERVAL_MS + autoScrollOffsetMs);

    return () => {
      cancelled = true;
      if (autoTimerRef.current) {
        clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, [
    advanceCarousel,
    autoScrollDirection,
    autoScrollOffsetMs,
    autoScrollPaused,
    items.length,
    pageVisible,
    prefersReducedMotion,
    userCooldown,
    userHolding,
  ]);

  const setCardRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(id, el);
    } else {
      cardRefs.current.delete(id);
    }
  };

  const onPointerEnter = () => setUserHolding(true);
  const onPointerLeave = () => setUserHolding(false);
  const onFocusCapture = () => setUserHolding(true);
  const onBlurCapture = (e: FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    setUserHolding(false);
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

      <div
        className="relative group"
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onFocusCapture={onFocusCapture}
        onBlurCapture={onBlurCapture}
      >
        <div
          ref={containerRef}
          className="scroll-strip surface-frame product-stage"
          aria-roledescription="carousel"
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
                className={`relative flex flex-col items-center overflow-hidden transition-[box-shadow,outline-color] duration-300 outline outline-2 outline-offset-[-1px] ${
                  item.status === "unavailable"
                    ? "outline-mono-200"
                    : selectedId === item.id
                      ? "outline-mono-900 shadow-[3px_3px_0_0_color-mix(in_srgb,var(--color-mono-900)_12%,transparent)]"
                      : "outline-transparent"
                }`}
              >
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
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
                  ) : null}

                  {item.status === "unavailable" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="stage-badge">WASH</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
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
