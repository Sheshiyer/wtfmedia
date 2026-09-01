export function originAllowed(origin: string | null, allowedOrigins: string | undefined): boolean {
  if (!origin || !allowedOrigins) return false;
  return allowedOrigins
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(origin);
}
