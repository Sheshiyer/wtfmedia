// The 14 operating modules of the wtfmedia control room (from the PRD).
export type ModuleStatus = "live" | "build" | "soon";

export type Module = {
  id: string;
  code: string;
  name: string;
  blurb: string;
  status: ModuleStatus;
  href?: string;
  accent: string; // tailwind bg class
};

export const MODULES: Module[] = [
  {
    id: "curation",
    code: "F1",
    name: "Ask WTF · Research",
    blurb: "Ask anything across the entire transcript catalogue. Cited, instant.",
    status: "live",
    href: "/chat",
    accent: "bg-wtf-yellow",
  },
  {
    id: "library",
    code: "F0",
    name: "Episode Library",
    blurb: "Every episode + transcript, indexed and production-ready.",
    status: "live",
    href: "/episodes",
    accent: "bg-wtf-orange",
  },
  {
    id: "contracts",
    code: "F2",
    name: "Contracts & Legal",
    blurb: "Guest releases, vendor MSAs, lawyer engagement — automated.",
    status: "build",
    accent: "bg-white",
  },
  {
    id: "payments",
    code: "F3",
    name: "Vendor Payments & Audit",
    blurb: "Invoice intake, approvals, reconciliation per episode budget.",
    status: "build",
    accent: "bg-white",
  },
  {
    id: "whatsapp",
    code: "F4",
    name: "WhatsApp Ingest",
    blurb: "Production group chats flow into the system of record.",
    status: "soon",
    accent: "bg-white",
  },
  {
    id: "editor-budget",
    code: "F5",
    name: "Editor Budgets",
    blurb: "Per-editor envelopes, hours, deliverables, payout triggers.",
    status: "soon",
    accent: "bg-white",
  },
  {
    id: "clips",
    code: "F6",
    name: "Clip Library",
    blurb: "Find any moment by transcript. 'The 30s where X said Y.'",
    status: "build",
    accent: "bg-white",
  },
  {
    id: "publish",
    code: "F7",
    name: "Publishing Pipeline",
    blurb: "Upload, schedule, chapter, end-card — with an audit trail.",
    status: "soon",
    accent: "bg-white",
  },
  {
    id: "dashboard",
    code: "F8",
    name: "Performance Dashboard",
    blurb: "Reach, cost-per-view, cost-per-follower across platforms.",
    status: "build",
    accent: "bg-white",
  },
  {
    id: "upload",
    code: "F9",
    name: "Large File Pipeline",
    blurb: "600GB/episode in/out — queued, ingested, archived, tracked.",
    status: "soon",
    accent: "bg-white",
  },
  {
    id: "travel",
    code: "F10",
    name: "Travel Budget Flow",
    blurb: "Producer request → finance approval → spend code.",
    status: "soon",
    accent: "bg-white",
  },
  {
    id: "files",
    code: "F11",
    name: "ZSet + Frame.io",
    blurb: "Keep the pipes; own the metadata and review state.",
    status: "soon",
    accent: "bg-white",
  },
  {
    id: "credentials",
    code: "F12",
    name: "Venue Credentials",
    blurb: "Encrypted IDs, one-time venue shares, auto-expiry.",
    status: "soon",
    accent: "bg-white",
  },
  {
    id: "knowledge",
    code: "F14",
    name: "Knowledge Box",
    blurb: "One data lake under it all. Search every episode, ever.",
    status: "build",
    accent: "bg-wtf-purple",
  },
];

export const STATUS_LABEL: Record<ModuleStatus, string> = {
  live: "Live",
  build: "Building",
  soon: "Soon",
};
export const STATUS_CHIP: Record<ModuleStatus, string> = {
  live: "bg-wtf-green text-cream",
  build: "bg-wtf-yellow text-ink",
  soon: "bg-white text-ink/60",
};
