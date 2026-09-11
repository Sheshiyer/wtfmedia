export function routeIsActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  const legacyBetaOpsRoot = ["/beta", "ops"].join("/");
  if (href === legacyBetaOpsRoot) return pathname === href;
  if (href === "/beta/workspace") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
