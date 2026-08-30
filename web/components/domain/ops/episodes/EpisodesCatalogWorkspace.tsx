"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export interface EpisodeSummary {
  id: string;
  slug: string;
  title: string;
  ip: string;
  showTitle: string;
  contentBucket: string;
  primaryLanguage: string;
  productionStatus: string;
  publishedAt: string | null;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  chapters: Array<{ title: string; startSec: number }>;
}

export function EpisodesCatalogWorkspace({ catalogueEndpoint }: { catalogueEndpoint?: string }) {
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [catalogMessage, setCatalogMessage] = useState(
    "no episode records from a live source. No episode data is shown.",
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");

  const fetchCatalog = useCallback(async () => {
    if (!catalogueEndpoint) return;
    setLoading(true);
    try {
      const res = await fetch(catalogueEndpoint, { cache: "no-store" });
      const data = await res.json().catch(() => null) as { episodes?: unknown } | null;
      if (!res.ok || !data || !Array.isArray(data.episodes)) {
        setEpisodes([]);
        setCatalogMessage("the catalogue request did not return an approved record set. No episode data is shown.");
        return;
      }

      setEpisodes(data.episodes as EpisodeSummary[]);
      setCatalogMessage(
        data.episodes.length === 0
          ? "no episode records from a live source."
          : "",
      );
    } catch {
      setEpisodes([]);
      setCatalogMessage("episode source unavailable. nothing inferred. No episode data is shown.");
    } finally {
      setLoading(false);
    }
  }, [catalogueEndpoint]);

  useEffect(() => {
    if (catalogueEndpoint) void fetchCatalog();
  }, [catalogueEndpoint, fetchCatalog]);

  const filteredEpisodes = episodes.filter((ep) => {
    if (statusFilter !== "all" && ep.productionStatus !== statusFilter) return false;
    if (languageFilter !== "all" && ep.primaryLanguage !== languageFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return ep.title.toLowerCase().includes(q) || ep.slug.toLowerCase().includes(q) || ep.id.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Search & Filters Bar */}
      <div className="grid gap-3 rounded-panel border-2 border-foreground bg-surface-raised p-4 sm:grid-cols-[1fr_160px_160px_auto] items-end">
        <label className="grid gap-1">
          <span className="font-label text-[11px] font-bold uppercase tracking-wider text-secondary">
            search episodes
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="title or slug"
            className="min-h-10 rounded-control border-2 border-foreground bg-canvas px-3 font-body text-sm text-foreground focus-visible:outline-attention"
          />
        </label>

        <label className="grid gap-1">
          <span className="font-label text-[11px] font-bold uppercase tracking-wider text-secondary">
            status
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-10 rounded-control border-2 border-foreground bg-canvas px-2 text-xs font-semibold uppercase text-foreground focus-visible:outline-attention"
          >
            <option value="all">all statuses</option>
            <option value="published">published</option>
            <option value="recorded">recorded</option>
            <option value="in_edit">in edit</option>
            <option value="ready">ready</option>
            <option value="archived">archived</option>
          </select>
        </label>

        <label className="grid gap-1">
          <span className="font-label text-[11px] font-bold uppercase tracking-wider text-secondary">
            language
          </span>
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="min-h-10 rounded-control border-2 border-foreground bg-canvas px-2 text-xs font-semibold uppercase text-foreground focus-visible:outline-attention"
          >
            <option value="all">all languages</option>
            <option value="hi-Latn">Hinglish (hi-Latn)</option>
            <option value="en">English (en)</option>
            <option value="hi">Hindi (hi)</option>
            <option value="mixed">mixed</option>
          </select>
        </label>

        <Button
          type="button"
          variant="ghost"
          onClick={() => void fetchCatalog()}
          disabled={loading || !catalogueEndpoint}
          className="min-h-10 border-2 border-foreground text-xs font-bold uppercase tracking-wider"
        >
          {loading ? "loading" : catalogueEndpoint ? "refresh" : "catalogue unavailable"}
        </Button>
      </div>

      {filteredEpisodes.length === 0 ? (
        <section
          role="status"
          aria-live="polite"
          className="rounded-panel border-2 border-foreground bg-surface-raised p-5 text-sm leading-relaxed text-secondary"
        >
          {loading ? "loading episode records" : catalogMessage}
        </section>
      ) : (
        <div className="rounded-panel border-2 border-foreground bg-surface-raised overflow-x-auto">
          <table className="w-full border-collapse text-left font-body text-xs">
            <thead>
              <tr className="border-b-2 border-foreground bg-surface-subtle font-label text-[11px] font-bold uppercase tracking-wider text-muted">
                <th className="p-3">id</th>
                <th className="p-3">title and slug</th>
                <th className="p-3">show</th>
                <th className="p-3">language</th>
                <th className="p-3">duration</th>
                <th className="p-3">status</th>
                <th className="p-3 text-right">action</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-foreground/20 font-mono text-[11px]">
              {filteredEpisodes.map((ep) => (
              <tr key={ep.id} className="hover:bg-canvas/50 transition-colors">
                <td className="p-3 font-bold text-foreground">{ep.id}</td>
                <td className="p-3 max-w-sm">
                  <strong className="block font-body text-xs font-bold text-foreground truncate">
                    {ep.title}
                  </strong>
                  <span className="block text-[10px] text-muted truncate">{ep.slug}</span>
                </td>
                <td className="p-3 text-secondary">{ep.ip}</td>
                <td className="p-3">
                  <span className="rounded border border-foreground/30 bg-canvas px-1.5 py-0.5 text-[10px]">
                    {ep.primaryLanguage}
                  </span>
                </td>
                <td className="p-3 text-secondary">
                  {ep.durationSeconds ? `${Math.round(ep.durationSeconds / 60)} min` : "N/A"}
                </td>
                <td className="p-3">
                  <span className="rounded border border-live bg-live/20 px-2 py-0.5 font-label text-[10px] font-bold uppercase text-foreground">
                    {ep.productionStatus}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <Link
                    href={`/ops/episodes/${ep.id}`}
                    className="inline-block rounded-control border-2 border-foreground bg-attention px-3 py-1 font-label text-[10px] font-bold uppercase tracking-wider text-on-attention shadow-[2px_2px_0_var(--wtf-foreground)] hover:shadow-[1px_1px_0_var(--wtf-foreground)]"
                  >
                    Inspect Provenance ↗
                  </Link>
                </td>
              </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
