"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { graphPaletteFromCssVariables } from "@/lib/public/theme-colors";

export type GNode = {
  id: string;
  label: string;
  category: string;
  episodeCount: number;
  episodes: string[];
};
export type GEdge = { a: string; b: string; shared: number };

type P = { x: number; y: number; vx: number; vy: number; r: number };

export function ConnectionGraph({
  nodes,
  edges,
  titles,
  selectedId,
  onSelect,
}: {
  nodes: GNode[];
  edges: GEdge[];
  titles: Record<string, string>;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    pts: P[];
    hover: number;
    drag: number;
    idx: Record<string, number>;
  }>({ pts: [], hover: -1, drag: -1, idx: {} });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    let W = 0,
      H = 0;

    const idx: Record<string, number> = {};
    nodes.forEach((n, i) => (idx[n.id] = i));
    const maxEps = Math.max(...nodes.map((n) => n.episodeCount), 1);
    const elist = edges.filter((e) => idx[e.a] != null && idx[e.b] != null);
    const maxShared = Math.max(...elist.map((e) => e.shared), 1);

    // reduced-motion: skip physics, use static circle layout
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    let palette = graphPaletteFromCssVariables(
      getComputedStyle(document.documentElement),
    );

    // init on a circle
    const pts: P[] = nodes.map((n, i) => {
      const a = (i / nodes.length) * Math.PI * 2;
      return {
        x: W / 2 + Math.cos(a) * Math.min(W, H) * 0.32,
        y: H / 2 + Math.sin(a) * Math.min(W, H) * 0.32,
        vx: 0,
        vy: 0,
        r: 8 + (n.episodeCount / maxEps) * 22,
      };
    });
    stateRef.current = { pts, hover: -1, drag: -1, idx };

    let alpha = prefersReduced ? 0 : 1;
    let raf = 0;
    let settled = prefersReduced;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const s = stateRef.current;
      const hov = s.hover;
      const selIdx = selectedId ? idx[selectedId] ?? -1 : -1;
      const neighbors = new Set<number>();
      const activeIdx = hov >= 0 ? hov : selIdx;
      if (activeIdx >= 0) {
        neighbors.add(activeIdx);
        for (const e of elist) {
          if (idx[e.a] === activeIdx) neighbors.add(idx[e.b]);
          if (idx[e.b] === activeIdx) neighbors.add(idx[e.a]);
        }
      }
      // edges
      for (const e of elist) {
        const i = idx[e.a],
          j = idx[e.b];
        const active =
          activeIdx < 0 ||
          (neighbors.has(i) &&
            neighbors.has(j) &&
            (i === activeIdx || j === activeIdx));
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[j].x, pts[j].y);
        ctx.strokeStyle = active ? palette.edgeActive : palette.edgeInactive;
        ctx.lineWidth = 0.5 + (e.shared / maxShared) * 3;
        ctx.stroke();
      }
      // nodes
      for (let i = 0; i < pts.length; i++) {
        const dim = activeIdx >= 0 && !neighbors.has(i);
        ctx.globalAlpha = dim ? 0.25 : 1;
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, pts[i].r, 0, Math.PI * 2);
        ctx.fillStyle = palette.category(nodes[i].category);
        ctx.fill();
        ctx.lineWidth = i === selIdx ? 3 : 2;
        ctx.strokeStyle = i === selIdx ? palette.selectedStroke : palette.nodeStroke;
        ctx.stroke();
        if (!dim && (pts[i].r > 16 || i === activeIdx)) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = palette.label;
          ctx.font = "600 11px Poppins, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(
            nodes[i].label,
            pts[i].x,
            pts[i].y + pts[i].r + 12,
          );
        }
      }
      ctx.globalAlpha = 1;
    };

    const tick = () => {
      const s = stateRef.current;
      // forces (skip if cooled and not interacting)
      if (alpha > 0.02 || s.drag >= 0) {
        for (let i = 0; i < pts.length; i++) {
          if (i === s.drag) continue;
          // center gravity
          pts[i].vx += (W / 2 - pts[i].x) * 0.0015 * alpha;
          pts[i].vy += (H / 2 - pts[i].y) * 0.0015 * alpha;
          // repulsion
          for (let j = 0; j < pts.length; j++) {
            if (i === j) continue;
            let dx = pts[i].x - pts[j].x;
            let dy = pts[i].y - pts[j].y;
            let d2 = dx * dx + dy * dy || 0.01;
            const f = (1600 * alpha) / d2;
            const d = Math.sqrt(d2);
            pts[i].vx += (dx / d) * f;
            pts[i].vy += (dy / d) * f;
          }
        }
        // springs
        for (const e of elist) {
          const i = idx[e.a],
            j = idx[e.b];
          const dx = pts[j].x - pts[i].x;
          const dy = pts[j].y - pts[i].y;
          const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const L = 70 + (1 - e.shared / maxShared) * 130;
          const f = (d - L) * 0.02 * alpha;
          const ux = (dx / d) * f,
            uy = (dy / d) * f;
          if (i !== s.drag) {
            pts[i].vx += ux;
            pts[i].vy += uy;
          }
          if (j !== s.drag) {
            pts[j].vx -= ux;
            pts[j].vy -= uy;
          }
        }
        for (let i = 0; i < pts.length; i++) {
          if (i === s.drag) continue;
          pts[i].vx *= 0.86;
          pts[i].vy *= 0.86;
          pts[i].x += pts[i].vx;
          pts[i].y += pts[i].vy;
          pts[i].x = Math.max(
            pts[i].r + 4,
            Math.min(W - pts[i].r - 4, pts[i].x),
          );
          pts[i].y = Math.max(
            pts[i].r + 4,
            Math.min(H - pts[i].r - 4, pts[i].y),
          );
        }
        alpha *= 0.992;
      } else if (!settled) {
        settled = true;
      }

      draw();

      // stop RAF when settled and not dragging
      if (!settled || s.drag >= 0) {
        raf = requestAnimationFrame(tick);
      }
    };

    if (prefersReduced) {
      // reduced motion: draw once, no physics
      draw();
    } else {
      raf = requestAnimationFrame(tick);
    }

    const hit = (mx: number, my: number) => {
      for (let i = pts.length - 1; i >= 0; i--) {
        const dx = mx - pts[i].x,
          dy = my - pts[i].y;
        if (dx * dx + dy * dy <= pts[i].r * pts[i].r) return i;
      }
      return -1;
    };
    const pos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e: PointerEvent) => {
      const { x, y } = pos(e);
      const s = stateRef.current;
      if (s.drag >= 0) {
        pts[s.drag].x = x;
        pts[s.drag].y = y;
        pts[s.drag].vx = pts[s.drag].vy = 0;
        alpha = Math.max(alpha, 0.3);
        settled = false;
        // restart RAF if it stopped
        if (!raf) raf = requestAnimationFrame(tick);
      } else {
        s.hover = hit(x, y);
        canvas.style.cursor = s.hover >= 0 ? "grab" : "default";
        if (!settled) draw();
      }
    };
    const onDown = (e: PointerEvent) => {
      const { x, y } = pos(e);
      const h = hit(x, y);
      stateRef.current.drag = h;
      if (h >= 0) canvas.setPointerCapture(e.pointerId);
    };
    const onUp = (e: PointerEvent) => {
      const { x, y } = pos(e);
      const s = stateRef.current;
      const h = hit(x, y);
      // click (no real drag movement) selects
      if (h >= 0 && s.drag === h && onSelect) {
        onSelect(nodes[h].id);
      }
      s.drag = -1;
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    window.addEventListener("resize", resize);

    const onThemeChange = () => {
      palette = graphPaletteFromCssVariables(
        getComputedStyle(document.documentElement),
      );
      draw();
    };
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const themeObserver = new MutationObserver(onThemeChange);
    systemTheme.addEventListener("change", onThemeChange);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-wtf-theme"],
    });

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", resize);
      systemTheme.removeEventListener("change", onThemeChange);
      themeObserver.disconnect();
    };
  }, [nodes, edges, titles, selectedId, onSelect]);

  return (
    <div
      className="relative overflow-hidden rounded-lg border-2 border-foreground bg-surface-raised"
      style={{ height: 560 }}
    >
      <canvas ref={canvasRef} className="w-full h-full block touch-none" />
      <div className="absolute top-3 left-3 text-[11px] text-muted">
        drag nodes · hover to isolate · click for episodes
      </div>
    </div>
  );
}
