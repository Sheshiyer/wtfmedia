"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export interface TranscriptVersion {
  id: string;
  episode_id: string;
  version_number: number;
  transcription_run_id: string | null;
  source_asset_id: string;
  content_sha256: string;
  coordinate_system: "uncut" | "published";
  total_segments: number;
  word_count: number;
  is_active: number;
  state: "staging" | "active" | "archived" | "tombstoned";
  activated_at: string | null;
  created_at: string;
}

export interface TranscriptSegment {
  id: string;
  transcript_version_id: string;
  segment_index: number;
  start_sec: number;
  end_sec: number;
  speaker_label: string;
  speaker_operator_id: number | null;
  text: string;
  text_normalized: string | null;
  language_code: "en" | "hi" | "hi-Latn" | "mixed";
  confidence: number | null;
}

function formatTimestamp(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function TranscriptStagingViewer({
  episodeId,
  versions,
  activeSegments,
  onVersionActivated,
}: {
  episodeId: string;
  versions: TranscriptVersion[];
  activeSegments: TranscriptSegment[];
  onVersionActivated?: (versionId: string) => void;
}) {
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    versions.find((v) => v.is_active === 1)?.id ?? versions[0]?.id ?? ""
  );
  const [speakerFilter, setSpeakerFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activating, setActivating] = useState<boolean>(false);
  const [activationNotice, setActivationNotice] = useState<string>("");

  const selectedVersion = versions.find((v) => v.id === selectedVersionId);
  const speakers = Array.from(new Set(activeSegments.map((s) => s.speaker_label))).filter(Boolean);

  const filteredSegments = activeSegments.filter((seg) => {
    if (speakerFilter !== "all" && seg.speaker_label !== speakerFilter) return false;
    if (searchQuery.trim()) {
      return seg.text.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const handleActivate = async () => {
    if (!selectedVersion || selectedVersion.is_active === 1) return;
    setActivating(true);
    setActivationNotice("");

    try {
      const res = await fetch(`/ops/api/episodes/${episodeId}/transcripts/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: selectedVersion.id }),
      });

      if (!res.ok) {
        throw new Error("Activation failed");
      }

      setActivationNotice(`Version ${selectedVersion.version_number} activated. Obsolete vector IDs tombstoned.`);
      onVersionActivated?.(selectedVersion.id);
    } catch {
      setActivationNotice("Activation is unavailable. No transcript version or vector state changed.");
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Version Selector Bar */}
      <div className="flex flex-col gap-4 rounded-panel border-2 border-foreground bg-canvas p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-label text-xs font-bold uppercase tracking-wider text-muted">
            Transcript Lineage:
          </span>
          {versions.map((ver) => {
            const isSelected = ver.id === selectedVersionId;
            const isActive = ver.is_active === 1;
            return (
              <button
                key={ver.id}
                type="button"
                onClick={() => setSelectedVersionId(ver.id)}
                className={`rounded-control border-2 px-3 py-1 font-mono text-xs font-semibold transition-colors ${
                  isSelected
                    ? "border-attention bg-attention text-on-attention shadow-[2px_2px_0_var(--wtf-foreground)]"
                    : "border-foreground/40 bg-surface-subtle text-foreground hover:border-foreground"
                }`}
              >
                V{ver.version_number} {isActive ? "(Active)" : `(${ver.state})`}
              </button>
            );
          })}
        </div>

        {selectedVersion && selectedVersion.is_active !== 1 && (
          <Button
            type="button"
            variant="attention"
            onClick={() => void handleActivate()}
            disabled={activating}
            className="border-2 border-foreground text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0_var(--wtf-foreground)]"
          >
            {activating ? "Activating Version..." : `Cutover to V${selectedVersion.version_number}`}
          </Button>
        )}
      </div>

      {activationNotice && (
        <div className="rounded-control border-2 border-live bg-live/10 p-3 text-xs text-foreground font-mono">
          ✓ {activationNotice}
        </div>
      )}

      {/* Segment Search & Filter Bar */}
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <label htmlFor="transcript-search-input" className="sr-only">
          Search transcript text
        </label>
        <input
          id="transcript-search-input"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search in transcript dialogue..."
          className="min-h-10 rounded-control border-2 border-foreground bg-canvas px-3 font-body text-sm text-foreground focus-visible:outline-attention"
        />

        <label htmlFor="speaker-filter-select" className="sr-only">
          Filter by speaker
        </label>
        <select
          id="speaker-filter-select"
          value={speakerFilter}
          onChange={(e) => setSpeakerFilter(e.target.value)}
          className="min-h-10 rounded-control border-2 border-foreground bg-canvas px-3 font-body text-xs font-semibold text-foreground focus-visible:outline-attention"
        >
          <option value="all">All Speakers ({speakers.length})</option>
          {speakers.map((spk) => (
            <option key={spk} value={spk}>
              {spk}
            </option>
          ))}
        </select>
      </div>

      {/* Diarized Segments Feed */}
      <div className="rounded-panel border-2 border-foreground bg-surface-raised divide-y-2 divide-foreground/20 max-h-[500px] overflow-y-auto">
        {filteredSegments.length === 0 ? (
          <div className="p-8 text-center text-secondary text-sm">
            no dialogue segments found.
          </div>
        ) : (
          filteredSegments.map((seg) => (
            <div key={seg.id || seg.segment_index} className="p-4 space-y-1.5 hover:bg-canvas/40 transition-colors">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded border border-foreground/40 bg-attention/20 px-2 py-0.5 font-label text-[10px] font-bold uppercase tracking-wider text-foreground">
                  {seg.speaker_label}
                </span>
                <span className="font-mono text-[11px] font-semibold text-secondary">
                  {formatTimestamp(seg.start_sec)} – {formatTimestamp(seg.end_sec)}
                </span>
                <span className="rounded bg-canvas border border-foreground/20 px-1.5 py-0.2 font-mono text-[9px] uppercase text-muted">
                  {seg.language_code}
                </span>
                {seg.confidence !== null && (
                  <span className="font-mono text-[10px] text-muted ml-auto">
                    {(seg.confidence * 100).toFixed(0)}% conf
                  </span>
                )}
              </div>
              <p className="font-body text-sm leading-relaxed text-foreground">
                {seg.text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
