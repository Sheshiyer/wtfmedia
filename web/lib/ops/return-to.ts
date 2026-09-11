const legacyOpsPath = /^\/ops(?:\/[^/?#]+)*$/;
const betaOpsPath = /^\/beta\/(?:workspace(?:\/[^/?#]+)*|settings(?:\/[^/?#]+)*|chat(?:\/[^/?#]+)?|admin(?:\/[^/?#]+)?)$/;
const betaOpsHome = "/beta/workspace";

/** Canonicalizes a requested destination to an internal activated protected path. */
export function validatedReturnTo(value: string | null | undefined): string {
  if (!value || value.length > 256 || value.includes("\\") || value.includes("%") || value.startsWith("//")) return betaOpsHome;
  try {
    const target = new URL(value, "https://wtfmedia.invalid");
    if (target.origin !== "https://wtfmedia.invalid" || target.search || target.hash) return betaOpsHome;
    if (betaOpsPath.test(target.pathname)) return target.pathname;
    if (legacyOpsPath.test(target.pathname)) {
      if (target.pathname === "/ops") return betaOpsHome;
      if (target.pathname === "/ops/chat") return "/beta/chat";
      if (target.pathname === "/ops/operators") return "/beta/admin/users";
      if (target.pathname === "/ops/audit") return "/beta/admin/audit";
      return `/beta${target.pathname}`;
    }
    return betaOpsHome;
  } catch {
    return betaOpsHome;
  }
}
