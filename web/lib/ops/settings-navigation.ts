import type { OperatorSettingsRole } from "./integration-contract";

export type SettingsSectionId =
  | "readiness"
  | "release"
  | "ai"
  | "analytics"
  | "sessions"
  | "memory"
  | "sources"
  | "access";

export type SettingsSection = {
  id: SettingsSectionId;
  href: `/ops/settings/${SettingsSectionId}`;
  label: string;
  eyebrow: string;
  description: string;
  status: string;
  group: "release" | "providers" | "governance" | "access";
  readRoles: readonly OperatorSettingsRole[];
};

const operatorRoles = ["super_admin", "admin", "editor"] as const;
const adminRoles = ["super_admin", "admin"] as const;

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  {
    id: "readiness",
    href: "/ops/settings/readiness",
    label: "beta readiness",
    eyebrow: "release evidence",
    description: "Read the activation gates and the evidence still required.",
    status: "read only",
    group: "release",
    readRoles: operatorRoles,
  },
  {
    id: "release",
    href: "/ops/settings/release",
    label: "release control",
    eyebrow: "server governed",
    description: "Inspect the authenticated Ask WTF release track and state.",
    status: "super-admin writes",
    group: "release",
    readRoles: operatorRoles,
  },
  {
    id: "ai",
    href: "/ops/settings/ai",
    label: "AI route",
    eyebrow: "provider policy",
    description: "Set the global model and explicit fallback order.",
    status: "admin writes",
    group: "providers",
    readRoles: operatorRoles,
  },
  {
    id: "analytics",
    href: "/ops/settings/analytics",
    label: "YouTube analytics",
    eyebrow: "source adapter",
    description: "Review the read-only connection contract and preview states.",
    status: "admin writes",
    group: "providers",
    readRoles: operatorRoles,
  },
  {
    id: "sessions",
    href: "/ops/settings/sessions",
    label: "sessions & history",
    eyebrow: "beta access",
    description: "Review Clerk session, owner scope, and archive policy.",
    status: "read only",
    group: "governance",
    readRoles: operatorRoles,
  },
  {
    id: "memory",
    href: "/ops/settings/memory",
    label: "memory governance",
    eyebrow: "data boundary",
    description: "Keep durable history separate from explicitly saved memory.",
    status: "explicit only",
    group: "governance",
    readRoles: operatorRoles,
  },
  {
    id: "sources",
    href: "/ops/settings/sources",
    label: "RAG & sources",
    eyebrow: "corpus receipt",
    description: "Inspect approved source counts and known alignment limits.",
    status: "read only",
    group: "governance",
    readRoles: operatorRoles,
  },
  {
    id: "access",
    href: "/ops/settings/access",
    label: "operator access",
    eyebrow: "protected administration",
    description: "Review the roster and governed seat-management boundary.",
    status: "admin only",
    group: "access",
    readRoles: adminRoles,
  },
] as const;

export const SETTINGS_GROUPS = [
  ["release", "release"] as const,
  ["providers", "providers"] as const,
  ["governance", "governance"] as const,
  ["access", "access"] as const,
];

export function settingsSectionsFor(role: OperatorSettingsRole): SettingsSection[] {
  return SETTINGS_SECTIONS.filter((section) => section.readRoles.includes(role));
}

export function settingsSectionForPath(pathname: string): SettingsSection | null {
  return SETTINGS_SECTIONS.find((section) => pathname === section.href) ?? null;
}

export function canReadSettingsSection(role: OperatorSettingsRole, id: SettingsSectionId): boolean {
  return SETTINGS_SECTIONS.find((section) => section.id === id)?.readRoles.includes(role) ?? false;
}

export function canManageSettings(role: OperatorSettingsRole): boolean {
  return role === "admin" || role === "super_admin";
}
