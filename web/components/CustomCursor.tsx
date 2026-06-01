"use client";

import { useEffect, useRef } from "react";

// Sticker-style custom cursor: a blob that grows on interactive elements and
// shows a label pill when the hovered element declares data-cursor="<label>".
export function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    document.body.classList.add("has-custom-cursor");
    const el = ref.current!;
    let raf = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;

    const move = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      const target = e.target as HTMLElement;
      const hot = target.closest(
        "a,button,input,textarea,[role=button],[data-cursor]"
      ) as HTMLElement | null;
      el.dataset.hot = hot ? "true" : "false";
      const label = hot?.getAttribute("data-cursor");
      if (label) {
        el.dataset.label = "true";
        const lab = el.querySelector(".cursor-label") as HTMLElement;
        if (lab) lab.textContent = label;
      } else {
        el.dataset.label = "false";
      }
    };

    const loop = () => {
      x += (tx - x) * 0.28;
      y += (ty - y) * 0.28;
      el.style.transform = `translate(${x - 9}px, ${y - 9}px)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", move);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("mousemove", move);
      cancelAnimationFrame(raf);
      document.body.classList.remove("has-custom-cursor");
    };
  }, []);

  return (
    <div ref={ref} className="cursor-dot" aria-hidden>
      <span className="cursor-blob" />
      <span className="cursor-label" />
    </div>
  );
}
