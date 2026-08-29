# Cloudflare-native web migration

## 1. Purpose

Move the Next.js public application from Vercel to a Cloudflare-native Worker
without granting the web runtime catalogue, queue, database, or AI bindings.

## 2. Current status

The repository contains a buildable OpenNext Worker named `wtfmedia-web`.
It is a preview-stage migration artifact until its deploy receipt, public
smoke checks, secret handoff, custom hostname, and `/ops` Access checks are
recorded.

## 3. Why this is a Worker, not Pages

The app has App Router SSR, middleware, route handlers, and a Node-compatible
server route. A static Cloudflare Pages export would lose those behaviors.
OpenNext packages the existing Next application as a Worker with static assets.

## 4. Target topology

```text
browser
  -> wtfmedia-web (OpenNext UI, public APIs, static assets)
       -> WTFMEDIA_EDGE service binding
            -> wtfmedia-edge (catalogue retrieval, D1, R2, KV, AI, queues)
```

Both Workers live in the same Cloudflare account, deploy through the same
Wrangler profile, and retain independent least-privilege bindings.

## 5. Web Worker bindings

`web/wrangler.jsonc` declares only:

- static assets;
- Cloudflare Images for Next image optimization;
- a self-reference used by OpenNext; and
- `WTFMEDIA_EDGE`, bound to the existing core Worker.

It intentionally does not receive D1, R2, KV, Vectorize, Queues, or Workers AI.

## 6. Chat transport

`/api/chat` calls the core Worker through the `WTFMEDIA_EDGE` service binding
at an internal URL. The public response shape, timeout, source headers, and
safe errors remain unchanged. The browser never receives the service secret,
client IP, or request identifier.

## 7. Secret handoff

The web Worker needs an `EDGE_SHARED_SECRET` Worker secret that matches the
existing core Worker during the parallel cutover. Set it through a secure
operator channel; never commit it, place it in `wrangler.jsonc`, or expose it
to browser code. Do not rotate the existing core secret as part of this step:
it is also used by the current upload-ticket boundary.

## 8. Public origin

Set `WTFMEDIA_APP_ORIGIN` only after an approved Cloudflare custom host is
known. It supplies canonical metadata. Until then, a workers.dev preview
derives its metadata origin from the Cloudflare request host; it deliberately
has no Vercel hostname fallback.

## 9. Local setup

```bash
cd web
npm ci
npm run cf:typegen
npm run typecheck
npm run cf:build
```

`npm run cf:preview` runs the built Worker locally. The protected `/ops`
surface remains fail-closed until its Access bridge is configured.

## 10. Explicit 9d9d deployment profile

Do not persistently activate a Wrangler profile for this repository. Use the
explicit script instead:

```bash
cd web
npm run cf:deploy:9d9d
```

It clears ambient Cloudflare token and account overrides, then passes
`--profile 9d9d` only for that command.

## 11. Preview acceptance

Before any custom-domain cutover, verify the deployed Worker URL serves the
public routes, static assets, and safe `/api/chat` configuration response.
After the secure secret handoff, verify an authenticated chat request through
the service binding. Record only status codes and public behavior, never
prompts, answers, tokens, or secret values.

## 12. `/ops` boundary

The existing core Worker currently authenticates `/ops` through Cloudflare
Access and forwards signed context to the historical web origin. Do not map
the production `/ops` hostname to `wtfmedia-web` until the core-to-web service
binding replacement, Access Application, policy, D1 operator records, and
recovery behavior have separately passed their gates.

## 13. Custom-domain cutover

An owner-approved Cloudflare zone and hostname are required before production
DNS routing. Set `WTFMEDIA_APP_ORIGIN`, attach the hostname to the web Worker,
then re-run public, chat, and `/ops` deny/recovery checks. The default
workers.dev address is a preview endpoint, not a permanent branded hostname.

## 14. Rollback

Keep the current Vercel production deployment untouched until the custom host
and Worker checks pass. Roll back by returning traffic to that existing
deployment; do not delete it while the secret handoff, custom domain, or
operator Access migration remains incomplete.

## 15. Vercel decommission gate

Delete only the resolved `wtfmedia` Vercel project after all of these are true:

1. a Cloudflare custom hostname is live;
2. public and chat smoke checks pass;
3. `/ops` Access and recovery behavior pass;
4. the secure secret handoff is recorded; and
5. the owner accepts the rollback-window end.

Deletion removes Vercel deployments, settings, and project-scoped environment
variables, so it is a final action rather than a migration prerequisite.

## 16. Follow-up consolidation

After the cutover, move the core `/ops` proxy from the historical origin to a
`WTFMEDIA_WEB` service binding. A later, separately reviewed change can split
public RAG into a private Worker and retire the shared-header compatibility
path. Do not combine that privilege redesign with the first web-host migration.
