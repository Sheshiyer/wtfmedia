/**
 * Server-only variant selector for public UI routes.
 *
 * Reads `WTF_PUBLIC_UI_VARIANT` from the server environment.
 * The canonical application versions are `"legacy"` and `"wtfos"`.
 *
 * Post-acceptance default: `"migrated"` (owner-approved cutover, Plan 01-20).
 * Explicit `WTF_PUBLIC_UI_VARIANT=legacy` remains a tested rollback path.
 * This value is never serialized to client output, query parameters, cookies,
 * or external configuration. It is read only in server components.
 */

export type AppUiVariant = "legacy" | "wtfos";
export type PublicUiVariant = "legacy" | "migrated";

export function appUiVariant(): AppUiVariant {
  return process.env.WTF_PUBLIC_UI_VARIANT === "legacy" ? "legacy" : "wtfos";
}

export function publicUiVariant(): PublicUiVariant {
  return appUiVariant() === "legacy" ? "legacy" : "migrated";
}
