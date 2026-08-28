export type LocalOpsRole = "super_admin" | "admin" | "editor";

export type LocalOpsHeaders = {
  payload: string;
  proof: string;
};

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function encodeOpsPayload(value: unknown): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

export async function signOpsProof(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toBase64Url(new Uint8Array(mac));
}

export function localDevRole(value: string | undefined): LocalOpsRole {
  return value === "admin" || value === "editor" || value === "super_admin"
    ? value
    : "super_admin";
}

export function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/**
 * Local `next dev` only. Production and non-loopback hosts stay fail-closed.
 * Kept free of `server-only` so Edge middleware can import it.
 */
export async function maybeLocalDevOpsHeaders(input: {
  nodeEnv: string | undefined;
  hostname: string;
  secret: string | undefined;
  role?: string;
}): Promise<LocalOpsHeaders | null> {
  if (input.nodeEnv !== "development") return null;
  if (!isLoopbackHost(input.hostname)) return null;
  if (!input.secret) return null;

  const role = localDevRole(input.role);
  const payload = encodeOpsPayload({
    operatorId: 1,
    role,
    environment: "local",
    correlationId: `local-dev-${role}-preview`,
    exp: Date.now() + 8 * 60 * 60 * 1000,
  });
  return {
    payload,
    proof: await signOpsProof(input.secret, payload),
  };
}
