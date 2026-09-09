export function formatOpsRole(role: string): string {
  if (role === "super_admin") return "super admin";
  if (role === "public_link") return "public link";
  return role;
}

export function formatVerifiedTime(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "not observed";
  // Keep the server and browser markup identical. A locale-dependent local
  // time rendered one way by Node and another way by the operator browser
  // causes a hydration mismatch in the shared context strip.
  return `${new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(parsed))} UTC`;
}
