"use client";

import { useState } from "react";
import { TranscriptStagingViewer } from "./TranscriptStagingViewer";
import { TimelineAlignmentEditor } from "./TimelineAlignmentEditor";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export interface EpisodeDto {
  id: string;
  slug: string;
  title: string;
  ip: string;
  showTitle: string;
  contentBucket: string;
  primaryLanguage: string;
  productionStatus: string;
  publishedAt: string | null;
  recordedAt: string | null;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  description: string;
  chapters: Array<{ title: string; startSec: number; endSec?: number }>;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalIdentityDto {
  id: number;
  episodeId: string;
  platform: string;
  externalId: string;
  channelId: string | null;
  isPrimary: boolean;
  observedAt: string;
}

export interface SourceAssetDto {
  id: string;
  episodeId: string;
  assetType: string;
  storageDriver: string;
  contentSha256: string;
  byteSize: number | null;
  durationSeconds: number | null;
  mimeType: string;
  authority: string;
  availability: string;
  createdAt: string;
}

export interface ProvenanceDAG {
  episode: EpisodeDto;
  externalIdentities: ExternalIdentityDto[];
  sourceAssets: SourceAssetDto[];
  transcriptVersions: any[];
  activeSegments: any[];
  timelineAlignment: any;
  ingestionJobs: any[];
}

type TabKey = "overview" | "assets" | "transcripts" | "alignment" | "audit";

export function EpisodeProvenanceInspector({
  provenance,
  onRefresh,
}: {
  provenance: ProvenanceDAG;
  onRefresh?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const { episode, externalIdentities, sourceAssets, transcriptVersions, activeSegments, timelineAlignment, ingestionJobs } = provenance;

  const tabs: Array<{ key: TabKey; label: string; count?: number }> = [
    { key: "overview", label: "overview" },
    { key: "assets", label: "assets", count: sourceAssets.length },
    { key: "transcripts", label: "transcripts", count: transcriptVersions.length },
    { key: "alignment", label: "alignment", count: timelineAlignment?.intervals?.length },
    { key: "audit", label: "jobs", count: ingestionJobs.length },
  ];

  return (
    <div className="space-y-6">
      {/* Top Navigation & Context Bar */}
      <div className="flex flex-col gap-4 border-b-2 border-foreground pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/ops/episodes"
            className="rounded-control border-2 border-foreground bg-canvas px-3 py-1.5 font-label text-xs font-bold uppercase tracking-wider text-foreground hover:bg-surface-subtle"
          >
            ← Back to Catalog
          </Link>
          <span className="font-mono text-xs font-semibold text-secondary">
            {episode.id}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => {
            const isCurrent = activeTab === t.key;
            return (
              <Button
                key={t.key}
                type="button"
                variant={isCurrent ? "attention" : "ghost"}
                pressed={isCurrent}
                onClick={() => setActiveTab(t.key)}
                className={`min-h-10 border-2 border-foreground text-xs font-bold uppercase tracking-wider ${
                  isCurrent ? "shadow-[3px_3px_0_var(--wtf-foreground)]" : ""
                }`}
              >
                {t.label} {t.count !== undefined ? `(${t.count})` : ""}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Metadata Card */}
            <div className="space-y-4 rounded-panel border-2 border-foreground bg-surface-raised p-4 sm:p-6">
              <h3 className="font-heading text-lg font-bold lowercase text-foreground">
                episode metadata
              </h3>

              <dl className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div>
                  <dt className="text-[10px] uppercase text-muted">IP / Show</dt>
                  <dd className="font-bold text-foreground">{episode.ip} • {episode.showTitle}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-muted">Status</dt>
                  <dd className="font-bold text-live uppercase">{episode.productionStatus}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-muted">Primary Language</dt>
                  <dd className="font-bold text-foreground">{episode.primaryLanguage}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-muted">Duration</dt>
                  <dd className="font-bold text-foreground">
                    {episode.durationSeconds ? `${Math.round(episode.durationSeconds / 60)} min` : "N/A"}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[10px] uppercase text-muted">Title</dt>
                  <dd className="font-bold font-body text-sm text-foreground">{episode.title}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[10px] uppercase text-muted">Slug</dt>
                  <dd className="text-secondary break-all">{episode.slug}</dd>
                </div>
              </dl>

              {episode.description && (
                <div className="border-t border-foreground/20 pt-3">
                  <span className="block font-label text-[10px] uppercase text-muted mb-1">Description</span>
                  <p className="font-body text-xs leading-relaxed text-secondary line-clamp-4">
                    {episode.description}
                  </p>
                </div>
              )}
            </div>

            {/* External Identities Card */}
            <div className="space-y-4 rounded-panel border-2 border-foreground bg-surface-raised p-4 sm:p-6">
              <h3 className="font-heading text-lg font-bold lowercase text-foreground">
                multi-platform external identities
              </h3>

              {externalIdentities.length === 0 ? (
                <p className="font-body text-xs text-secondary">
                  no external platform mappings registered.
                </p>
              ) : (
                <div className="space-y-2">
                  {externalIdentities.map((ext) => (
                    <div
                      key={ext.id || `${ext.platform}_${ext.externalId}`}
                      className="flex items-center justify-between rounded border border-foreground/30 bg-canvas p-2.5 font-mono text-xs"
                    >
                      <div>
                        <span className="rounded bg-attention/20 border border-foreground/30 px-1.5 py-0.5 text-[10px] uppercase font-bold text-foreground">
                          {ext.platform}
                        </span>
                        <span className="ml-2 font-bold text-foreground">{ext.externalId}</span>
                      </div>
                      {ext.isPrimary && (
                        <span className="font-label text-[10px] uppercase font-bold text-live">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Chapters */}
              {episode.chapters && episode.chapters.length > 0 && (
                <div className="border-t border-foreground/20 pt-3">
                  <span className="block font-label text-[10px] uppercase text-muted mb-2">
                    Chapter Markers ({episode.chapters.length})
                  </span>
                  <div className="space-y-1 max-h-40 overflow-y-auto font-mono text-xs">
                    {episode.chapters.map((ch, idx) => (
                      <div key={idx} className="flex items-center justify-between text-secondary">
                        <span className="truncate pr-2">{ch.title}</span>
                        <span className="text-muted">{Math.floor(ch.startSec / 60)}:{(ch.startSec % 60).toString().padStart(2, "0")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Source Assets */}
      {activeTab === "assets" && (
        <div className="rounded-panel border-2 border-foreground bg-surface-raised overflow-x-auto">
          <table className="w-full border-collapse text-left font-body text-xs">
            <thead>
              <tr className="border-b-2 border-foreground bg-surface-subtle font-label text-[11px] font-bold uppercase tracking-wider text-muted">
                <th className="p-3">Asset ID</th>
                <th className="p-3">Type</th>
                <th className="p-3">Driver</th>
                <th className="p-3">Content SHA-256</th>
                <th className="p-3">Size</th>
                <th className="p-3">Authority</th>
                <th className="p-3">Availability</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-foreground/20 font-mono text-[11px]">
              {sourceAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-canvas/50">
                  <td className="p-3 font-bold text-foreground">{asset.id}</td>
                  <td className="p-3">
                    <span className="rounded border border-foreground/40 bg-canvas px-2 py-0.5 text-[10px]">
                      {asset.assetType}
                    </span>
                  </td>
                  <td className="p-3 text-secondary">{asset.storageDriver}</td>
                  <td className="p-3 font-mono text-[10px] text-muted truncate max-w-[140px]" title={asset.contentSha256}>
                    {asset.contentSha256.slice(0, 16)}...
                  </td>
                  <td className="p-3 text-secondary">
                    {asset.byteSize ? `${(asset.byteSize / 1024 / 1024).toFixed(2)} MB` : "N/A"}
                  </td>
                  <td className="p-3 text-secondary">{asset.authority}</td>
                  <td className="p-3">
                    <span className="rounded border border-live bg-live/20 px-2 py-0.5 font-label text-[10px] font-bold uppercase text-foreground">
                      {asset.availability}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Transcripts */}
      {activeTab === "transcripts" && (
        <TranscriptStagingViewer
          episodeId={episode.id}
          versions={transcriptVersions}
          activeSegments={activeSegments}
          onVersionActivated={onRefresh}
        />
      )}

      {/* Tab 4: Timeline Alignment */}
      {activeTab === "alignment" && (
        <TimelineAlignmentEditor
          alignment={timelineAlignment?.alignment}
          intervals={timelineAlignment?.intervals ?? []}
        />
      )}

      {/* Tab 5: Audit & Ingestion Jobs */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="rounded-panel border-2 border-foreground bg-surface-raised overflow-x-auto">
            <table className="w-full border-collapse text-left font-body text-xs">
              <thead>
                <tr className="border-b-2 border-foreground bg-surface-subtle font-label text-[11px] font-bold uppercase tracking-wider text-muted">
                  <th className="p-3">Job ID</th>
                  <th className="p-3">Job Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Attempts</th>
                  <th className="p-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-foreground/20 font-mono text-[11px]">
                {ingestionJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-canvas/50">
                    <td className="p-3 font-bold text-foreground">{job.id}</td>
                    <td className="p-3 text-secondary">{job.job_type}</td>
                    <td className="p-3">
                      <span className="rounded border border-live bg-live/20 px-2 py-0.5 text-[10px] uppercase font-bold">
                        {job.status}
                      </span>
                    </td>
                    <td className="p-3 text-secondary">{job.attempts} / {job.max_attempts}</td>
                    <td className="p-3 text-muted">{new Date(job.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
