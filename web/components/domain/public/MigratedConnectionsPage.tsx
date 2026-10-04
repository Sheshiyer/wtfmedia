"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConnectionGraph } from "@/components/ConnectionGraph";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import type { TopicConnection, TopicConnectionsData } from "@/lib/topic-connections";

function categoryClass(category: string) {
  const key = category.toLowerCase();
  if (key.includes("ai") || key.includes("tech")) return "bg-knowledge text-on-knowledge";
  if (key.includes("start") || key.includes("business")) return "bg-information text-on-information";
  if (key.includes("money") || key.includes("market")) return "border-live bg-canvas text-foreground";
  if (key.includes("geo") || key.includes("society")) return "bg-editorial text-on-editorial";
  if (key.includes("health")) return "border-live bg-canvas text-foreground";
  if (key.includes("media") || key.includes("culture")) return "bg-information text-on-information";
  if (key.includes("science") || key.includes("climate")) return "bg-live text-on-live";
  if (key.includes("people") || key.includes("leadership")) return "bg-attention text-foreground";
  return "bg-surface-structure text-on-structure";
}

function confidenceClass(confidence: TopicConnection["confidence"]) {
  if (confidence === "high") return "border-live text-live";
  if (confidence === "medium") return "border-attention text-foreground";
  return "border-foreground/30 text-secondary";
}

function formatClock(seconds: number) {
  const rounded = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainder = rounded % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function LoadingState() {
  return (
    <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-12 sm:px-8 xl:px-12" aria-live="polite">
      <div className="border-2 border-foreground bg-surface-raised p-6 shadow-[6px_6px_0_var(--wtf-foreground)]">
        <p className="font-label text-xs font-bold uppercase tracking-[0.14em] text-secondary">reading the topic index</p>
        <p className="mt-3 font-heading text-2xl font-bold text-foreground">Mapping recurring ideas to transcript moments…</p>
      </div>
    </div>
  );
}

export default function MigratedConnectionsPage() {
  const [data, setData] = useState<TopicConnectionsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [scrollEdges, setScrollEdges] = useState({ top: false, bottom: false });
  const topicScrollRef = useRef<HTMLDivElement>(null);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const categoryButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/connections", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`connections_${response.status}`);
        return response.json() as Promise<TopicConnectionsData>;
      })
      .then((payload) => {
        if (payload.schemaVersion !== "topic-connections.v1") throw new Error("connections_schema_mismatch");
        setData(payload);
        setSelectedId(payload.topics[0]?.id ?? null);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "connections_unavailable");
      });
    return () => controller.abort();
  }, []);

  const categories = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.topics.map((topic) => topic.category))].sort((left, right) => left.localeCompare(right));
  }, [data]);

  const categoryCounts = useMemo(() => {
    if (!data) return new Map<string, number>();
    return new Map(categories.map((item) => [item, data.topics.filter((topic) => topic.category === item).length]));
  }, [categories, data]);

  const filteredTopics = useMemo(() => {
    if (!data) return [];
    const normalized = query.trim().toLowerCase();
    return data.topics.filter((topic) => {
      if (category !== "all" && topic.category !== category) return false;
      if (!normalized) return true;
      return [topic.label, topic.category, topic.summary, ...topic.anchorPhrases, ...topic.relatedPhrases]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [category, data, query]);

  const updateScrollEdges = useCallback(() => {
    const element = topicScrollRef.current;
    if (!element) return;
    const threshold = 3;
    setScrollEdges({
      top: element.scrollTop > threshold,
      bottom: element.scrollTop + element.clientHeight < element.scrollHeight - threshold,
    });
  }, []);

  useEffect(() => {
    if (!categoryMenuOpen) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!categoryMenuRef.current?.contains(event.target as Node)) setCategoryMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setCategoryMenuOpen(false);
      categoryButtonRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [categoryMenuOpen]);

  useEffect(() => {
    const element = topicScrollRef.current;
    if (element) element.scrollTop = 0;
    const frame = requestAnimationFrame(updateScrollEdges);
    return () => cancelAnimationFrame(frame);
  }, [category, query, updateScrollEdges]);

  useEffect(() => {
    const frame = requestAnimationFrame(updateScrollEdges);
    return () => cancelAnimationFrame(frame);
  }, [filteredTopics.length, updateScrollEdges]);

  const selectedTopic = data?.topics.find((topic) => topic.id === selectedId) ?? null;
  const graphNodes = useMemo(
    () => (data?.topics ?? []).map((topic) => ({
      id: topic.id,
      label: topic.label,
      category: topic.category,
      episodeCount: topic.episodeCount,
      episodes: topic.occurrences.map((occurrence) => occurrence.episodeId),
    })),
    [data],
  );
  const graphEdges = useMemo(
    () => (data?.edges ?? []).map((edge) => ({
      a: edge.source,
      b: edge.target,
      shared: edge.sharedEpisodeCount,
    })),
    [data],
  );
  const graphTitles = useMemo(
    () => Object.fromEntries((data?.topics ?? []).flatMap((topic) =>
      topic.occurrences.map((occurrence) => [occurrence.episodeId, occurrence.title]),
    )),
    [data],
  );
  const relatedTopics = useMemo(() => {
    if (!data || !selectedTopic) return [];
    return data.edges
      .filter((edge) => edge.source === selectedTopic.id || edge.target === selectedTopic.id)
      .sort((a, b) => b.sharedEpisodeCount - a.sharedEpisodeCount)
      .slice(0, 5)
      .map((edge) => {
        const id = edge.source === selectedTopic.id ? edge.target : edge.source;
        return {
          topic: data.topics.find((candidate) => candidate.id === id),
          sharedEpisodeCount: edge.sharedEpisodeCount,
        };
      })
      .filter((item): item is { topic: TopicConnection; sharedEpisodeCount: number } => Boolean(item.topic));
  }, [data, selectedTopic]);

  const timedMomentCount = data?.topics.reduce((sum, topic) => sum + topic.occurrenceCount, 0) ?? 0;

  return (
    <div className="min-h-screen bg-canvas">
      <WorkspaceHeader
        eyebrow="transcript intelligence"
        title="connections"
        summary="recurring topics discovered across the catalogue, with the exact transcript moments and the perspective each episode adds."
        accent="information"
        context={data ? (
          <div className="flex flex-wrap gap-x-6 gap-y-2 font-label text-[11px] font-bold uppercase tracking-[0.12em] text-secondary">
            <span>{data.topics.length} discovered topics</span>
            <span>{data.source.episodeCount} indexed episodes</span>
            <span>{timedMomentCount} timed moments</span>
          </div>
        ) : undefined}
      />

      {!data && !error ? <LoadingState /> : null}

      {error ? (
        <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-12 sm:px-8 xl:px-12" role="alert">
          <div className="border-2 border-editorial bg-surface-raised p-6 shadow-[6px_6px_0_var(--wtf-editorial)]">
            <p className="font-label text-xs font-bold uppercase tracking-[0.14em] text-editorial">topic index unavailable</p>
            <h2 className="mt-3 font-heading text-2xl font-bold text-foreground">Connections could not be loaded.</h2>
            <p className="mt-2 text-sm text-secondary">The page failed closed instead of showing stale or invented evidence. Refresh to try again.</p>
          </div>
        </div>
      ) : null}

      {data ? (
        <main className="mx-auto grid max-w-[var(--wtf-content-max)] gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.45fr)] xl:px-12 xl:py-12">
          <aside className="min-w-0 self-start lg:sticky lg:top-24 lg:pr-1">
            <div className="flex h-[75dvh] flex-col overflow-hidden border-2 border-foreground bg-surface-raised shadow-[6px_6px_0_var(--wtf-foreground)] lg:h-[calc(100dvh-7.5rem)]">
              <div className="shrink-0 p-4">
                <label htmlFor="connections-search" className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">search topics</label>
                <input
                  id="connections-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-control border-2 border-foreground bg-canvas px-3 font-body text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-information"
                  placeholder="AI agents, climate, markets…"
                />
              </div>

              <section role="region" aria-label="Connection nodes" className="flex min-h-0 flex-1 flex-col border-t-2 border-foreground">
                <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
                  <h2 className="font-heading text-xl font-bold lowercase text-foreground">topics</h2>
                  <span className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{filteredTopics.length}</span>
                </div>

                <div className="relative min-h-0 flex-1">
                  <div
                    ref={topicScrollRef}
                    onScroll={updateScrollEdges}
                    className="h-full overflow-y-auto overscroll-contain px-4 pb-4 [scrollbar-color:var(--wtf-foreground)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-foreground/35 [&::-webkit-scrollbar-thumb:hover]:bg-foreground/60 [&::-webkit-scrollbar-track]:bg-transparent"
                    data-testid="connections-topic-scroll"
                  >
                    {filteredTopics.length > 0 ? (
                      <ul className="space-y-2" data-testid="graph-node-list">
                        {filteredTopics.map((topic) => (
                          <li key={topic.id}>
                            <button
                              type="button"
                              data-testid={`graph-node-${topic.id}`}
                              data-node-id={topic.id}
                              aria-pressed={topic.id === selectedTopic?.id}
                              onClick={() => setSelectedId(topic.id)}
                              className="w-full rounded-control border-2 border-foreground bg-canvas p-3 text-left transition-colors hover:bg-attention/20 aria-pressed:bg-attention/20"
                            >
                              <span className={`mb-2 inline-block rounded border px-2 py-0.5 text-[10px] font-semibold ${categoryClass(topic.category)}`}>{topic.category}</span>
                              <span className="block text-sm font-semibold text-foreground">{topic.label}</span>
                              <span className="mt-1 block text-xs text-secondary">{topic.episodeCount} episodes · {topic.occurrenceCount} exact locations</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="rounded-control border border-foreground/20 bg-canvas p-3 text-sm text-secondary">No indexed topic matches those filters.</p>
                    )}
                  </div>

                  {scrollEdges.top ? (
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-surface-raised to-transparent" />
                  ) : null}
                  {scrollEdges.bottom ? (
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-surface-raised to-transparent" />
                  ) : null}
                </div>

                <div className="relative z-20 shrink-0 border-t-2 border-foreground bg-surface-subtle p-3">
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 font-label text-[10px] font-bold uppercase tracking-[0.12em] text-secondary">category</span>
                    <div ref={categoryMenuRef} className="relative min-w-0 flex-1">
                      {categoryMenuOpen ? (
                        <div
                          id="connections-category-menu"
                          role="listbox"
                          aria-label="Topic categories"
                          className="absolute inset-x-0 bottom-[calc(100%+0.5rem)] max-h-[min(22rem,55vh)] overflow-y-auto rounded-control border-2 border-foreground bg-surface-raised p-1 shadow-[5px_5px_0_var(--wtf-foreground)]"
                          data-testid="connections-category-menu"
                        >
                          {["all", ...categories].map((item) => {
                            const active = item === category;
                            const label = item === "all" ? "All categories" : item;
                            const count = item === "all" ? data.topics.length : categoryCounts.get(item) ?? 0;
                            return (
                              <button
                                key={item}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onClick={() => {
                                  setCategory(item);
                                  if (item !== "all") {
                                    setSelectedId(data.topics.find((topic) => topic.category === item)?.id ?? null);
                                  }
                                  setCategoryMenuOpen(false);
                                  categoryButtonRef.current?.focus();
                                }}
                                className="flex min-h-10 w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-attention/25 aria-selected:bg-attention/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information"
                              >
                                <span>{label}</span>
                                <span className="font-label text-[10px] tabular-nums text-muted">{active ? "✓ " : ""}{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                      <button
                        ref={categoryButtonRef}
                        id="connections-category"
                        type="button"
                        aria-label={`Category: ${category === "all" ? "All categories" : category}`}
                        aria-haspopup="listbox"
                        aria-expanded={categoryMenuOpen}
                        aria-controls="connections-category-menu"
                        onClick={() => setCategoryMenuOpen((open) => !open)}
                        className="flex min-h-9 w-full items-center justify-between gap-3 rounded-control border-2 border-foreground bg-canvas px-3 font-body text-xs font-semibold text-foreground hover:bg-attention/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-information"
                      >
                        <span className="truncate">{category === "all" ? "All categories" : category}</span>
                        <span aria-hidden="true" className="text-sm leading-none">{categoryMenuOpen ? "▴" : "▾"}</span>
                      </button>
                    </div>
                    <span data-testid="connections-category-count" className="shrink-0 font-label text-[10px] font-bold tabular-nums text-muted">{filteredTopics.length}/{data.topics.length}</span>
                  </div>
                </div>
              </section>
            </div>
          </aside>

          <div className="min-w-0 space-y-6">
            <section aria-label="connections graph" className="min-w-0">
              <div aria-hidden="true" tabIndex={-1} data-testid="graph-canvas">
                <ConnectionGraph
                  nodes={graphNodes}
                  edges={graphEdges}
                  titles={graphTitles}
                  selectedId={selectedTopic?.id ?? null}
                  onSelect={setSelectedId}
                />
              </div>
            </section>

            <section role="region" aria-label="Connection edges" className="sr-only">
              <ul data-testid="graph-edge-list">
                {data.edges.map((edge) => (
                  <li key={`${edge.source}-${edge.target}`} data-testid={`graph-edge-${edge.source}-${edge.target}`}>
                    {edge.source} + {edge.target} ({edge.sharedEpisodeCount} shared)
                  </li>
                ))}
              </ul>
            </section>

            {selectedTopic ? (
              <section
                role="region"
                aria-label={`Details for ${selectedTopic.label}`}
                data-testid="graph-selection-detail"
                className="border-2 border-foreground bg-surface-raised shadow-[6px_6px_0_var(--wtf-foreground)]"
              >
                <div className="border-b-2 border-foreground p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded border px-2 py-1 font-label text-[10px] font-bold uppercase tracking-[0.1em] ${categoryClass(selectedTopic.category)}`}>{selectedTopic.category}</span>
                    <span className={`rounded border bg-canvas px-2 py-1 font-label text-[10px] font-bold uppercase tracking-[0.1em] ${confidenceClass(selectedTopic.confidence)}`}>{selectedTopic.confidence} confidence</span>
                  </div>
                  <h2 className="mt-4 font-heading text-3xl font-bold text-foreground sm:text-4xl">{selectedTopic.label}</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-secondary sm:text-base">{selectedTopic.summary}</p>
                  <p className="mt-3 text-xs leading-relaxed text-muted">
                    <span className="font-semibold text-secondary">Matched language:</span>{" "}
                    {selectedTopic.anchorPhrases.map((phrase) => `“${phrase}”`).join(", ")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
                    <span>{selectedTopic.episodeCount} connected episodes</span>
                    <span>{selectedTopic.occurrenceCount} caption-aligned locations</span>
                    <span>semantic score {selectedTopic.confidenceScore.toFixed(2)}</span>
                  </div>
                </div>

                {relatedTopics.length > 0 ? (
                  <div className="border-b border-foreground/20 px-5 py-4 sm:px-6">
                    <p className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-muted">connected topics</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {relatedTopics.map(({ topic, sharedEpisodeCount }) => (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => setSelectedId(topic.id)}
                          className="rounded-control border border-foreground bg-canvas px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-attention/20"
                        >
                          {topic.label} · {sharedEpisodeCount} shared
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="p-5 sm:p-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-muted">transcript evidence</p>
                      <h3 className="mt-1 font-heading text-2xl font-bold text-foreground">where the connection appears</h3>
                    </div>
                    <span className="hidden font-label text-[10px] font-bold uppercase tracking-[0.1em] text-muted sm:block">published captions only</span>
                  </div>
                  <ol className="mt-5 space-y-4">
                    {selectedTopic.occurrences.map((occurrence, index) => (
                      <li key={`${occurrence.episodeId}:${occurrence.startSec}`} className="rounded-card border-2 border-foreground bg-canvas p-4 sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-label text-[10px] font-bold uppercase tracking-[0.12em] text-information">evidence {String(index + 1).padStart(2, "0")} · {formatClock(occurrence.startSec)}–{formatClock(occurrence.endSec)} · match {occurrence.relevance.toFixed(2)}</p>
                            <h4 className="mt-1 font-heading text-lg font-bold leading-snug text-foreground">{occurrence.title}</h4>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <a
                              href={occurrence.url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-control border-2 border-foreground bg-attention px-3 py-2 font-label text-[10px] font-bold uppercase tracking-[0.1em] text-foreground hover:bg-attention/70"
                            >watch moment ↗</a>
                            <Link
                              href={`/episodes/${encodeURIComponent(occurrence.episodeId)}`}
                              data-testid={`graph-episode-link-${occurrence.episodeId}`}
                              data-episode-id={occurrence.episodeId}
                              className="rounded-control border-2 border-foreground bg-canvas px-3 py-2 font-label text-[10px] font-bold uppercase tracking-[0.1em] text-foreground hover:bg-surface-subtle"
                            >episode</Link>
                          </div>
                        </div>
                        <blockquote className="mt-4 border-l-4 border-information pl-4 text-sm leading-relaxed text-secondary">“{occurrence.excerpt}”</blockquote>
                        <p className="mt-4 text-sm font-semibold leading-relaxed text-foreground">{occurrence.connection}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            ) : null}

            <section className="border border-foreground/20 bg-surface-subtle p-4 text-xs leading-relaxed text-secondary">
              <span className="font-semibold text-foreground">How this is built:</span> the catalogue’s RAG embeddings are clustered by semantic similarity, then representative passages are aligned back to native published captions. A relationship here means recurring discussion—not identity, ownership, endorsement, or causality. Untimestamped matches are not shown.
            </section>
          </div>
        </main>
      ) : null}
    </div>
  );
}
