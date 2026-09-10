export function routeIsActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/beta/ops") return pathname === "/beta/ops";
  return pathname === href || pathname.startsWith(`${href}/`);
}
