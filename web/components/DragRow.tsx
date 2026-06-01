"use client";

import { useRef } from "react";

// Horizontal drag-to-scroll strip (the "DRAG" carousels from the reference).
export function DragRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const state = useRef({ down: false, startX: 0, scroll: 0, moved: false });

  const onDown = (e: React.PointerEvent) => {
    const el = ref.current!;
    state.current = {
      down: true,
      startX: e.clientX,
      scroll: el.scrollLeft,
      moved: false,
    };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!state.current.down) return;
    const dx = e.clientX - state.current.startX;
    if (Math.abs(dx) > 4) state.current.moved = true;
    ref.current!.scrollLeft = state.current.scroll - dx;
  };
  const onUp = () => (state.current.down = false);
  // prevent click navigation after a drag
  const onClickCapture = (e: React.MouseEvent) => {
    if (state.current.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div
      ref={ref}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onClickCapture={onClickCapture}
      data-cursor="drag"
      className="drag-row flex gap-4 overflow-x-auto pb-3 -mx-1 px-1"
    >
      {children}
    </div>
  );
}
