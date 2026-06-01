"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  rankedModels,
  fmtContext,
  fmtLatency,
  type Scored,
} from "@/lib/models";

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <span className="inline-block w-10 h-1.5 rounded-full bg-ink/15 overflow-hidden align-middle">
      <span
        className="block h-full rounded-full"
        style={{ width: `${Math.round(value * 100)}%`, background: color }}
      />
    </span>
  );
}

export function ModelPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const models = useMemo(() => rankedModels(), []);
  const current = models.find((m) => m.id === value) || models[0];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        data-cursor="model"
        className="pill px-3 py-1.5 bg-white text-xs inline-flex items-center gap-2 hover:bg-cream"
        title="Choose the answer model"
      >
        <span className="w-2 h-2 rounded-full bg-wtf-green" />
        <span className="font-semibold">{current.label}</span>
        <span className="text-ink/40">#{current.rank}</span>
        <span aria-hidden className="text-ink/40">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[340px] max-h-[60vh] overflow-y-auto card-flat bg-cream z-50 p-2 shadow-[6px_6px_0_#1A1A1A]">
          <div className="px-2 py-2 flex items-center justify-between">
            <span className="eyebrow text-ink/55">answer model</span>
            <span className="text-[10px] text-ink/40">ranked · ctx · speed · media</span>
          </div>
          {models.map((m: Scored) => {
            const active = m.id === value;
            return (
              <button
                key={m.id}
                onClick={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
                data-cursor="pick"
                className={`w-full text-left rounded-xl p-2.5 mb-1 border-2 transition-colors ${
                  active
                    ? "border-ink bg-white"
                    : "border-transparent hover:bg-white/70"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="chip bg-wtf-yellow shrink-0">#{m.rank}</span>
                  <span className="font-semibold text-sm truncate">{m.label}</span>
                  <span className="text-[10px] text-ink/40 ml-auto shrink-0">
                    {m.vendor}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[11px] text-ink/70 items-center">
                  <span className="text-ink/45">ctx</span>
                  <span className="flex items-center gap-1.5">
                    <Bar value={m.scores.context} color="#6758A5" />
                    {fmtContext(m.context)}
                  </span>
                  <span className="text-ink/45">speed</span>
                  <span className="flex items-center gap-1.5">
                    <Bar value={m.scores.latency} color="#0C9367" />
                    {fmtLatency(m.latencyMs)}
                  </span>
                  <span className="text-ink/45">media</span>
                  <span className="flex items-center gap-1.5">
                    <Bar value={m.scores.media} color="#C53B3A" />
                    {m.modalities.join(" + ")}
                  </span>
                </div>
                {m.note && (
                  <div className="mt-1.5 text-[10px] text-ink/45 italic">
                    {m.note}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
