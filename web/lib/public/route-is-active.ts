export function routeIsActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/ops") return pathname === "/ops";
  return pathname === href || pathname.startsWith(`${href}/`);
}
