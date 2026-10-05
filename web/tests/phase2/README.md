# Phase 2 UI verification

Run `CI=1 node scripts/verify-phase2.mjs` from `web` for the complete gate.
The browser suite uses `playwright.phase2.config.ts` and an isolated Next build
on port 4174. Its temporary config aliases only the Clerk provider adapters;
application middleware, canonical Beta pages, principal gate, navigation and
components run unchanged. No fixture switch exists in the production config.
Environment files and generated builds are excluded from the temporary copy.

Each test supplies the principal-context API response and any required provider
records. All other API requests fail closed and external browser requests are
blocked. Fixtures test UI behavior, not live Clerk authentication or D1 authority;
backend auth/RBAC tests remain in the gate, and real staging persona acceptance
remains a separate release requirement. Tests never use production credentials.
