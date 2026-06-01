"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkle } from "./Sparkle";

type Tool = "pencil" | "spray" | "fill" | "eraser";
const PALETTE = ["#1A1A1A", "#C53B3A", "#0C9367", "#F1B333", "#6758A5", "#2D6BE0"];

// Full-playground easter egg: "show us what you can draw."
export function PaintCanvas() {
  const [open, setOpen] = useState(false);
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState("#C53B3A");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    if (!open) return;
    const c = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    c.width = c.clientWidth * dpr;
    c.height = c.clientHeight * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [open]);

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const start = (e: React.PointerEvent) => {
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    if (tool === "fill") {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvasRef.current!.clientWidth, canvasRef.current!.clientHeight);
      return;
    }
    drawing.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 28;
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    } else if (tool === "spray") {
      ctx.fillStyle = color;
      for (let i = 0; i < 18; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 14;
        ctx.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.6, 1.6);
      }
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const end = () => (drawing.current = false);
  const reset = () => {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-cursor="draw!"
        className="group inline-flex items-center gap-2 pill px-5 py-2.5 bg-wtf-yellow text-ink font-semibold"
      >
        <Sparkle size={16} color="#fff" />
        Show us what you can draw
      </button>

      {open && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="card-flat w-full max-w-3xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-ink bg-cream">
              <span className="eyebrow">WTF studio · scratchpad</span>
              <button
                onClick={() => setOpen(false)}
                data-cursor="close"
                className="chip bg-wtf-red text-cream"
              >
                Close ✕
              </button>
            </div>
            <canvas
              ref={canvasRef}
              onPointerDown={start}
              onPointerMove={draw}
              onPointerUp={end}
              onPointerLeave={end}
              className="w-full h-[55vh] halftone-dense touch-none block"
            />
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t-2 border-ink bg-cream">
              {(["pencil", "spray", "fill", "eraser"] as Tool[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTool(t)}
                  className={`chip ${
                    tool === t ? "bg-ink text-cream" : "bg-white"
                  }`}
                >
                  {t}
                </button>
              ))}
              <div className="flex items-center gap-1.5 ml-1">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    aria-label={c}
                    className="w-6 h-6 rounded-full border-2 border-ink"
                    style={{
                      background: c,
                      outline: color === c ? "2px solid #1A1A1A" : "none",
                      outlineOffset: "2px",
                    }}
                  />
                ))}
              </div>
              <button onClick={reset} className="chip bg-white ml-auto">
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
