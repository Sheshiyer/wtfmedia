export function routeIsActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/beta/workspace") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
