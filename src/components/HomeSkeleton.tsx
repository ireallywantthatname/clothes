/**
 * Structural stand-in for the closet UI while locked.
 * No data, no interactive chrome — only the silhouette of Mix.
 */
export default function HomeSkeleton() {
  return (
    <div className="w-full max-w-lg mx-auto" aria-hidden="true" data-skeleton>
      <header className="sticky top-0 z-10 bg-mono-0/95 backdrop-blur-sm pt-4 -mt-1">
        <div className="flex items-end justify-between w-full border-b border-mono-200 pb-4">
          <div className="flex flex-col gap-1">
            <div className="h-8 w-36 skeleton-block" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 skeleton-block" />
            <div className="h-10 w-16 skeleton-block" />
          </div>
        </div>

        <div className="seg-track">
          <div className="seg-item bg-mono-100">
            <div className="mx-auto h-3 w-10 skeleton-block-ink" />
          </div>
          <div className="seg-item bg-mono-0">
            <div className="mx-auto h-3 w-12 skeleton-block-ink" />
          </div>
        </div>
      </header>

      <div className="pt-5 flex flex-col items-center gap-7 w-full">
        {/* Top rack */}
        <div className="w-full flex flex-col gap-2">
          <div className="h-3 w-12 skeleton-block" />
          <div className="surface-frame product-stage aspect-[4/5] w-full max-w-sm mx-auto flex flex-col items-center justify-center gap-6 px-8 py-10">
            <div className="w-full max-w-[12rem] aspect-[3/4] skeleton-block-stage" />
            <div className="h-3 w-24 skeleton-block-stage" />
          </div>
        </div>

        <div className="flex items-center gap-4 w-full">
          <div className="flex-1 h-px bg-mono-200" />
          <div className="h-2.5 w-10 skeleton-block" />
          <div className="flex-1 h-px bg-mono-200" />
        </div>

        {/* Bottom rack */}
        <div className="w-full flex flex-col gap-2">
          <div className="h-3 w-16 skeleton-block" />
          <div className="surface-frame product-stage aspect-[4/5] w-full max-w-sm mx-auto flex flex-col items-center justify-center gap-6 px-8 py-10">
            <div className="w-full max-w-[12rem] aspect-[3/4] skeleton-block-stage" />
            <div className="h-3 w-20 skeleton-block-stage" />
          </div>
        </div>

        <div className="h-12 w-full max-w-xs skeleton-block" />
      </div>
    </div>
  );
}
