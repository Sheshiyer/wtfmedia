# Three-channel YouTube analytics

The analytics workspace has one **All channels** page at `/beta/analytics` and one page per connected channel at `/beta/analytics/channels/UC…`. The navigation shows the connected channel names. The shared page sums additive observations and weights CTR, average view duration, and retention by their underlying denominators. If any connected channel has missing daily observations in the selected date range, the shared page marks coverage as partial and withholds combined metrics. Previous-period and 28-day comparison baselines are checked independently; incomplete baselines remain unavailable even when the current period is complete. Observed zero-view days count as covered.

An analytics admin can connect up to three channels:

1. Open **All channels** and choose **connect Google** or **add another YouTube account**.
2. Choose the Google account in the existing OAuth consent flow. Google lists the YouTube channels that account authorizes.
3. Select one channel. The workspace opens its dedicated page.
4. Choose **update data** on each channel page to synchronize it. The shared page then reads the stored observations from all connected channels.

Each channel keeps its own encrypted OAuth grant, connection state, sync freshness, and Google Reporting job. An existing channel can be reconnected without losing its stored analytics, including when all three slots are occupied. Choose **reconnect Google**, authorize the existing channel, and select it. The verified channel selection and database constraint still reject a fourth account. To replace a channel after the three-channel limit is reached, disconnect that channel and connect another. Google credentials stay server-side.

The three channels may belong to three different Google accounts. The OAuth request uses Google's account chooser for each connection, and the selected channel receives that account's own encrypted refresh token. If the chooser silently returns to a previous account, sign out of that Google account in the consent window or select **Use another account**. If Google denies a different account before the channel picker appears, check that account's access to its YouTube channel and, while the OAuth app is in Testing, its presence in the app's test-user list.

## Local connection check

Use `http://localhost:3000/beta/analytics` for Google OAuth. The hostname and port must match the registered `GOOGLE_OAUTH_REDIRECT_URI` exactly; `127.0.0.1:4322` is a different origin. Keep the Google client ID, client secret, and stable analytics encryption key in ignored `cloudflare/.dev.vars`. The local Edge also needs the Clerk issuer and authorized party settings in ignored `.dev.vars.local`. Set the matching public Clerk key and `WTFMEDIA_EDGE_LOCAL_ORIGIN=http://localhost:8787` in ignored `web/.env.local`. Never commit these files.

Run the D1 migration against an isolated local state directory, then start both services:

```sh
cd cloudflare
wrangler d1 migrations apply DB --config wrangler.jsonc --env local --local --persist-to .wrangler/local-multi-state
wrangler dev --config wrangler.jsonc --env local --local --persist-to .wrangler/local-multi-state --ip localhost --port 8787 --env-file .dev.vars --env-file .dev.vars.local
```

```sh
cd web
npm run dev -- --hostname localhost --port 3000
```

Use separate terminals for the two servers. `--local` is essential because the named `local` configuration otherwise includes a remote staging D1 binding. The pinned Wrangler version may require `--compatibility-date 2026-06-02` on the `wrangler dev` command until its runtime is upgraded. Before opening Google consent, a CLI request to `http://localhost:3000/beta/api/principal-context` without a session should return `401`; that confirms the web-to-Edge route. Complete the three Google authorizations in the signed-in browser, selecting and syncing each channel separately.

Migration `0029_youtube_multi_account.sql` is required before using the new flow. It moves an existing selected YouTube connection into the first channel slot and preserves the channel's stored observations and existing Reporting job. Before deployment, record a D1 recovery bookmark and the existing Worker versions. The legacy credential moves into the channel account, so rolling back to pre-migration code also requires a coordinated database recovery; do not roll back the old Edge Worker alone. Deployment receipts belong in the project handoff.
