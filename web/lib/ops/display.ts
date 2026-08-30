export function formatOpsRole(role: string): string {
  if (role === "super_admin") return "super admin";
  if (role === "public_link") return "public link";
  return role;
}

export function formatVerifiedTime(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "not observed";
  return new Date(parsed).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
