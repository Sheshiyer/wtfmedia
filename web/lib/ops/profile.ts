export type OperatorProfileRole = "super_admin" | "admin" | "editor";
export type OperatorProfileEnvironment = "local" | "staging" | "production";

export type OperatorProfile = {
  displayName: string;
  email: string;
  role: OperatorProfileRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  identityProvider: "clerk";
  mapping: "normalized_email_to_active_d1_operator" | "edge_to_d1_readback_pending";
  mappingStatus: "matched" | "pending" | "unavailable";
  environment: OperatorProfileEnvironment;
  workspace: "operations";
  organizationScope: "unknown";
};

const roles: readonly OperatorProfileRole[] = ["super_admin", "admin", "editor"];
const environments: readonly OperatorProfileEnvironment[] = ["local", "staging", "production"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function parseOperatorProfile(value: unknown): OperatorProfile | null {
  if (!isRecord(value)) return null;
  const candidate = isRecord(value.profile) ? value.profile : value;
  if (!isString(candidate.displayName) || !isString(candidate.email)) return null;
  if (!roles.includes(candidate.role as OperatorProfileRole)) return null;
  if (!environments.includes(candidate.environment as OperatorProfileEnvironment)) return null;
  if (typeof candidate.active !== "boolean") return null;
  if (!isString(candidate.createdAt) || !isString(candidate.updatedAt)) return null;
  if (candidate.identityProvider !== "clerk") return null;
  if (candidate.mapping !== "normalized_email_to_active_d1_operator") return null;
  if (candidate.mappingStatus !== "matched") return null;
  if (candidate.workspace !== "operations" || candidate.organizationScope !== "unknown") return null;
  return {
    displayName: candidate.displayName,
    email: candidate.email,
    role: candidate.role as OperatorProfileRole,
    active: candidate.active,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
    identityProvider: "clerk",
    mapping: "normalized_email_to_active_d1_operator",
    mappingStatus: "matched",
    environment: candidate.environment as OperatorProfileEnvironment,
    workspace: "operations",
    organizationScope: "unknown",
  };
}

export function profileDate(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "not observed";
  const date = new Date(parsed);
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, "0"), String(date.getUTCDate()).padStart(2, "0")].join("-");
}
