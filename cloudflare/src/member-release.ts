import type { DB } from "./db.ts";

export type MemberBetaRelease = {
  environment: "local" | "staging" | "production";
  state: "paused" | "preview" | "stable" | "rolled_back";
  source: "manifest" | "default";
};

const validState = (value: unknown): value is MemberBetaRelease["state"] => ["paused", "preview", "stable", "rolled_back"].includes(String(value));

/** A missing row, any production request, or an unknown state is held closed. */
export async function resolveMemberBetaRelease(db: DB, environment: MemberBetaRelease["environment"]): Promise<MemberBetaRelease> {
  if (environment === "production") return { environment, state: "paused", source: "default" };
  try {
    const row = await db.prepare("SELECT state FROM member_beta_releases WHERE environment = ?").bind(environment).first<{ state: unknown }>();
    if (row && validState(row.state)) return { environment, state: row.state, source: "manifest" };
  } catch {
    // The migration is itself a deployment gate: pre-migration targets remain closed.
  }
  return { environment, state: "paused", source: "default" };
}

export function isMemberBetaEnabled(release: MemberBetaRelease): boolean {
  return release.environment !== "production" && (release.state === "preview" || release.state === "stable");
}
