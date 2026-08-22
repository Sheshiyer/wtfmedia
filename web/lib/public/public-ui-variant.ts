/**
 * Server-only variant selector for public UI routes.
 *
 * Reads `WTF_PUBLIC_UI_VARIANT` from the server environment.
 * Returns `"legacy"` or `"migrated"`.
 *
 * Pre-acceptance default: `"legacy"`.
 * This value is never serialized to client output, query parameters, cookies,
 * or external configuration. It is read only in server components.
 */

export type PublicUiVariant = "legacy" | "migrated";

export function publicUiVariant(): PublicUiVariant {
  const raw = process.env.WTF_PUBLIC_UI_VARIANT;
  if (raw === "migrated") return "migrated";
  return "legacy";
}
