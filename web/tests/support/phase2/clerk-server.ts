// Provider adapter only: application middleware and principal admission still run.
import type { NextRequest } from "next/server";
export async function auth() { return { userId: "phase2-fixture-user", getToken: async () => "phase2-fixture-token" }; }
export function clerkMiddleware(callback: (auth: typeof import("./clerk-server").auth, request: NextRequest) => unknown) {
  return (request: NextRequest) => callback(auth, request);
}
