"use client";

import { DEFAULT_MODEL, MODELS } from "@/lib/models";

export function ModelPicker({ onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(DEFAULT_MODEL)}
      data-cursor="model"
      className="pill px-3 py-1.5 bg-white text-xs inline-flex items-center gap-2 hover:bg-cream"
      title="Answer model"
    >
      <span className="w-2 h-2 rounded-full bg-wtf-green" />
      <span className="font-semibold">{MODELS[0].label}</span>
    </button>
  );
}
