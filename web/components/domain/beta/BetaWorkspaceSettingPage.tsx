"use client";

import { useBetaPrincipal } from "./BetaPrincipalGate";
import { AIProviderSettingsPanel } from "@/components/domain/ops/AIProviderSettingsPanel";
import { YouTubeAnalyticsSettingsPanel } from "@/components/domain/ops/YouTubeAnalyticsSettingsPanel";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export function BetaWorkspaceSettingPage({ section }: { section: "readiness" | "ai" | "analytics" | "sessions" | "memory" | "sources" }) {
  const principal = useBetaPrincipal();
  if (principal.kind !== "operator" || !["editor", "admin", "super_admin"].includes(principal.role)) {
    return <main className="p-6" data-beta-settings-denied>Access is not granted.</main>;
  }
  const role = principal.role as "editor" | "admin" | "super_admin";
  const title = section === "ai" ? "AI route" : section === "analytics" ? "YouTube analytics" : section === "readiness" ? "Beta readiness" : section === "sessions" ? "sessions & history" : section === "memory" ? "memory governance" : "RAG & sources";
  const summary = section === "ai" || section === "analytics" ? "This is a local preview only. It is not persisted and does not change provider or inference state." : "A server-governed workspace area with evidence and explicit lifecycle boundaries.";
  return <section className="min-w-0"><WorkspaceHeader size="page" eyebrow={`settings / ${section}`} title={title} summary={summary} accent="information" /><div className="mt-6">{section === "ai" ? <AIProviderSettingsPanel role={role} previewOnly /> : section === "analytics" ? <YouTubeAnalyticsSettingsPanel role={role} previewOnly /> : <article className="border-2 border-foreground bg-surface-raised p-6"><p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">server evidence</p><h2 className="mt-2 font-heading text-2xl font-bold lowercase">{title.toLowerCase()}</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">{summary} Nothing is inferred from an unavailable endpoint.</p></article>}</div></section>;
}
