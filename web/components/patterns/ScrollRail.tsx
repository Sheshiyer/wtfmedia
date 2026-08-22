"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";

export interface ScrollRailProps extends HTMLAttributes<HTMLDivElement> {
  /** Label for the previous button (screen readers) */
  prevLabel?: string;
  /** Label for the next button (screen readers) */
  nextLabel?: string;
  /** Scroll distance per step in pixels */
  step?: number;
  children: ReactNode;
}

/**
 * Native overflow-x horizontal rail with labelled previous/next controls.
 *
 * Input paths: keyboard (ArrowLeft/Right, Home/End), touch (native scroll),
 * wheel (horizontal or Shift+vertical), and button click.
 *
 * Start/end controls disable when at corresponding edge.
 * Respects `prefers-reduced-motion` immediately.
 */
export const ScrollRail = forwardRef<HTMLDivElement, ScrollRailProps>(
  function ScrollRail(
    {
      prevLabel = "Scroll previous",
      nextLabel = "Scroll next",
      step = 300,
      children,
      className = "",
      ...props
    },
    ref,
  ) {
    const innerRef = useRef<HTMLDivElement>(null);
    const [atStart, setAtStart] = useState(true);
    const [atEnd, setAtEnd] = useState(false);

    // Merge refs
    const setRef = useCallback(
      (el: HTMLDivElement | null) => {
        (innerRef as React.MutableRefObject<HTMLDivElement | null>).current =
          el;
        if (typeof ref === "function") ref(el);
        else if (ref)
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
      },
      [ref],
    );

    const checkEdges = useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      const tolerance = 2;
      setAtStart(el.scrollLeft <= tolerance);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - tolerance);
    }, []);

    useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      checkEdges();
      el.addEventListener("scroll", checkEdges, { passive: true });
      const ro = new ResizeObserver(checkEdges);
      ro.observe(el);
      return () => {
        el.removeEventListener("scroll", checkEdges);
        ro.disconnect();
      };
    }, [checkEdges]);

    const getReducedMotion = useCallback(() => {
      if (typeof window === "undefined") return true;
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }, []);

    const scrollBy = useCallback(
      (direction: "prev" | "next") => {
        const el = innerRef.current;
        if (!el) return;
        const distance = direction === "prev" ? -step : step;
        el.scrollBy({
          left: distance,
          behavior: getReducedMotion() ? "instant" : "smooth",
        });
      },
      [step, getReducedMotion],
    );

    const scrollToStart = useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      el.scrollTo({
        left: 0,
        behavior: getReducedMotion() ? "instant" : "smooth",
      });
    }, [getReducedMotion]);

    const scrollToEnd = useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      el.scrollTo({
        left: el.scrollWidth,
        behavior: getReducedMotion() ? "instant" : "smooth",
      });
    }, [getReducedMotion]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        switch (e.key) {
          case "ArrowLeft":
            e.preventDefault();
            scrollBy("prev");
            break;
          case "ArrowRight":
            e.preventDefault();
            scrollBy("next");
            break;
          case "Home":
            e.preventDefault();
            scrollToStart();
            break;
          case "End":
            e.preventDefault();
            scrollToEnd();
            break;
        }
      },
      [scrollBy, scrollToStart, scrollToEnd],
    );

    // Horizontal wheel: convert vertical wheel to horizontal scroll
    const handleWheel = useCallback(
      (e: React.WheelEvent) => {
        const el = innerRef.current;
        if (!el) return;
        // Only intercept when there is horizontal overflow
        if (el.scrollWidth <= el.clientWidth) return;
        // If the user is scrolling vertically (deltaY) and not horizontally,
        // convert to horizontal scroll
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
          e.preventDefault();
          el.scrollBy({
            left: e.deltaY,
            behavior: getReducedMotion() ? "instant" : "auto",
          });
        }
      },
      [getReducedMotion],
    );

    return (
      <div className={`relative ${className}`} {...props}>
        {/* Previous button */}
        <button
          type="button"
          aria-label={prevLabel}
          disabled={atStart}
          onClick={() => scrollBy("prev")}
          className={[
            "absolute left-0 top-1/2 -translate-y-1/2 z-10",
            "w-10 h-10 flex items-center justify-center",
            "rounded-full bg-cream/90 border-2 border-ink/20",
            "text-ink/60 hover:text-ink hover:border-ink/40",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink",
            "disabled:opacity-30 disabled:pointer-events-none",
            "transition-opacity",
          ].join(" ")}
          aria-hidden={atStart ? "true" : undefined}
          tabIndex={atStart ? -1 : 0}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M10 12L6 8L10 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Scrollable rail */}
        <div
          ref={setRef}
          role="region"
          aria-label="Scrollable content"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onWheel={handleWheel}
          className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 scroll-smooth"
          style={{ scrollbarWidth: "thin" }}
        >
          {children}
        </div>

        {/* Next button */}
        <button
          type="button"
          aria-label={nextLabel}
          disabled={atEnd}
          onClick={() => scrollBy("next")}
          className={[
            "absolute right-0 top-1/2 -translate-y-1/2 z-10",
            "w-10 h-10 flex items-center justify-center",
            "rounded-full bg-cream/90 border-2 border-ink/20",
            "text-ink/60 hover:text-ink hover:border-ink/40",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink",
            "disabled:opacity-30 disabled:pointer-events-none",
            "transition-opacity",
          ].join(" ")}
          aria-hidden={atEnd ? "true" : undefined}
          tabIndex={atEnd ? -1 : 0}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6 4L10 8L6 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    );
  },
);
