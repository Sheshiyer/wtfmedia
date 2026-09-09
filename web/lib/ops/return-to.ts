const opsPath = /^\/ops(?:\/[^/?#]+)*$/;

/** Canonicalizes a requested destination to an internal activated protected path. */
export function validatedReturnTo(value: string | null | undefined): "/ops" | string {
  if (!value || value.length > 256 || value.includes("\\") || value.includes("%") || value.startsWith("//")) return "/ops";
  try {
    const target = new URL(value, "https://wtfmedia.invalid");
    if (target.origin !== "https://wtfmedia.invalid" || !opsPath.test(target.pathname) || target.search || target.hash) return "/ops";
    return target.pathname;
  } catch {
    return "/ops";
  }
}
