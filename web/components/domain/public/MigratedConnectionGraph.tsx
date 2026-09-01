"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicConnectionsData } from "@/lib/public/connections";
import { graphPaletteFromCssVariables } from "@/lib/public/theme-colors";

/**
 * Migrated Connection Graph (Plan 01-13).
 *
 * Consumes the public projection only — no raw data types.
 * Uses semantic tokens from tokens.css for colors.
 */

type GNode = PublicConnectionsData["nodes"][number];
type GEdge = PublicConnectionsData["edges"][number];

// category -> semantic token classes (covers entity + theme category names)
function categoryClass(c: string): string {
  const k = c.toLowerCase();
  if (k.includes("ai") || k.includes("tech")) return "bg-knowledge text-on-knowledge";
  if (k.includes("start") || k.includes("business")) return "bg-information text-on-information";
  if (k.includes("money") || k.includes("finance") || k.includes("market")) {
    return "border-live bg-canvas text-foreground";
  }
  if (k.includes("geo") || k.includes("society")) return "bg-editorial text-on-editorial";
  if (k.includes("health")) return "border-live bg-canvas text-foreground";
  if (k.includes("media") || k.includes("culture")) return "bg-information text-on-information";
  if (k.includes("india")) return "bg-attention text-on-attention";
  if (k.includes("mind") || k.includes("philos")) return "bg-surface-structure text-on-structure";
  if (k.includes("science")) return "bg-information text-on-information";
  return "bg-surface-structure text-on-structure";
}

type P = { x: number; y: number; vx: number; vy: number; r: number };

export function MigratedConnectionGraph({
  data,
}: {
  data: PublicConnectionsData;
}) {
  const { nodes, edges } = data;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selected, setSelected] = useState<GNode | null>(null);
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

    let alpha = 1;
    let raf = 0;

    const tick = () => {
      const s = stateRef.current;
      if (alpha > 0.02 || s.drag >= 0) {
        for (let i = 0; i < pts.length; i++) {
          if (i === s.drag) continue;
          pts[i].vx += (W / 2 - pts[i].x) * 0.0015 * alpha;
          pts[i].vy += (H / 2 - pts[i].y) * 0.0015 * alpha;
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
          pts[i].x = Math.max(pts[i].r + 4, Math.min(W - pts[i].r - 4, pts[i].x));
          pts[i].y = Math.max(pts[i].r + 4, Math.min(H - pts[i].r - 4, pts[i].y));
        }
        alpha *= 0.992;
      }

      ctx.clearRect(0, 0, W, H);
      const hov = s.hover;
      const neighbors = new Set<number>();
      if (hov >= 0) {
        neighbors.add(hov);
        for (const e of elist) {
          if (idx[e.a] === hov) neighbors.add(idx[e.b]);
          if (idx[e.b] === hov) neighbors.add(idx[e.a]);
        }
      }
      for (const e of elist) {
        const i = idx[e.a],
          j = idx[e.b];
        const active = hov < 0 || (neighbors.has(i) && neighbors.has(j) && (i === hov || j === hov));
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[j].x, pts[j].y);
        ctx.strokeStyle = active ? palette.edgeActive : palette.edgeInactive;
        ctx.lineWidth = 0.5 + (e.shared / maxShared) * 3;
        ctx.stroke();
      }
      for (let i = 0; i < pts.length; i++) {
        const dim = hov >= 0 && !neighbors.has(i);
        ctx.globalAlpha = dim ? 0.25 : 1;
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, pts[i].r, 0, Math.PI * 2);
        ctx.fillStyle = palette.category(nodes[i].category);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = palette.nodeStroke;
        ctx.stroke();
        if (!dim && (pts[i].r > 16 || i === hov)) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = palette.label;
          ctx.font = "600 11px Poppins, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(nodes[i].label, pts[i].x, pts[i].y + pts[i].r + 12);
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

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
      } else {
        s.hover = hit(x, y);
        canvas.style.cursor = s.hover >= 0 ? "grab" : "default";
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
      if (h >= 0 && s.drag === h) setSelected(nodes[h]);
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
  }, [nodes, edges]);

  return (
    <div className="relative h-[560px] overflow-hidden rounded-panel border-2 border-foreground bg-surface-raised">
      <canvas ref={canvasRef} className="w-full h-full block touch-none" />
      <div className="absolute left-3 top-3 text-[11px] text-muted">
        drag nodes · hover to isolate · click for episodes
      </div>

      {selected && (
        <div className="absolute right-3 top-3 max-h-[92%] w-72 overflow-y-auto rounded-control border-2 border-foreground bg-surface-raised p-4 shadow-[6px_6px_0_var(--wtf-surface-structure)]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div
                className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold ${categoryClass(selected.category)}`}
              >
                {selected.category}
              </div>
              <h3 className="mt-2 font-semibold leading-snug text-foreground">{selected.label}</h3>
              <p className="mt-0.5 text-xs text-secondary">
                {selected.episodeCount} episodes
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              data-cursor="close"
              className="inline-block shrink-0 rounded bg-editorial px-2 py-0.5 text-[10px] font-semibold text-on-editorial"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 space-y-1">
            {selected.episodes.map((vid) => (
              <a
                key={vid}
                href={`https://www.youtube.com/watch?v=${vid}`}
                target="_blank"
                rel="noreferrer"
                data-cursor="watch"
                className="block truncate rounded bg-canvas px-2 py-1 text-[11px] text-foreground transition-colors hover:bg-attention/20"
              >
                {vid}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
