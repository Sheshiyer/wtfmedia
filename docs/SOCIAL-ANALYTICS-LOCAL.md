# Social analytics local lab

The standalone `/social-analytics` route is a local-only experiment. It uses
Zernio's hosted OAuth handoff so a teammate connects LinkedIn, Instagram,
Facebook, or X (Twitter) from WTF OS without entering provider credentials into this
repository.

The same workspace is also available at `/beta/social-analytics` for signed-in
beta users with `analytics:read` when Clerk is configured locally. During
`next dev`, the public WTF OS hamburger links to `/social-analytics`, and the
beta hamburger links to `/beta/social-analytics` for local principals.

## Local environment

Create `web/.env.local` with these uncommitted values:

```dotenv
ZERNIO_API_KEY=your_server_side_zernio_key
SOCIAL_ANALYTICS_LOCAL_ENABLED=1
```

The explicit enable flag is intentionally absent from deployed environments.
The API key is read only by Next.js route handlers. Client components receive
connection URLs and normalized analytics data, never the key. All three route
handlers also reject non-loopback hostnames, preserving the experimental local
boundary until the module is intentionally integrated with beta authentication.
The server discovers the Zernio profile using this key. It selects the sole
accessible profile, or the unique default if several are visible. If several
profiles have no unique default, use a key scoped to the intended workspace;
the app will not silently connect the team to an arbitrary profile.

## Flow

1. Open `http://localhost:3000/social-analytics`.
2. Choose a platform and select **connect**.
3. Complete Zernio's hosted OAuth and any page/profile selection.
4. Zernio returns to `/social-analytics`; the page refreshes account health.
5. When the Zernio Analytics add-on is available, the dashboard loads unified
   totals, daily distribution, follower movement, and top posts.

LinkedIn personal-profile analytics can be limited to posts published through
Zernio. LinkedIn organization pages and the other supported account types may
return broader provider history according to their permissions.
