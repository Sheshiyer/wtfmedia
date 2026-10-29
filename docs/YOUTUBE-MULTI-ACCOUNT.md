# Three-channel YouTube analytics

The analytics workspace has one **All channels** page at `/beta/analytics` and one page per connected channel at `/beta/analytics/channels/UC…`. The navigation shows the connected channel names. The shared page sums additive observations and weights CTR, average view duration, and retention by their underlying denominators. If any connected channel has missing daily observations in the selected date range, the shared page marks coverage as partial and withholds combined metrics. Previous-period and 28-day comparison baselines are checked independently; incomplete baselines remain unavailable even when the current period is complete. Observed zero-view days count as covered.

An analytics admin can connect up to three channels:

1. Open **All channels** and choose **connect Google** or **add another YouTube account**.
2. Choose the Google account in the existing OAuth consent flow. Google lists the YouTube channels that account authorizes.
3. Select one channel. The workspace opens its dedicated page.
4. Choose **update data** on each channel page to synchronize it. The shared page then reads the stored observations from all connected channels.

Each channel keeps its own encrypted OAuth grant, connection state, sync freshness, and Google Reporting job. An existing channel can be reconnected without losing its stored analytics, including when all three slots are occupied. Choose **reconnect Google**, authorize the existing channel, and select it. The verified channel selection and database constraint still reject a fourth account. To replace a channel after the three-channel limit is reached, disconnect that channel and connect another. Google credentials stay server-side.

Migration `0029_youtube_multi_account.sql` is required before using the new flow. It moves an existing selected YouTube connection into the first channel slot and preserves the channel's stored observations and existing Reporting job. Before deployment, record a D1 recovery bookmark and the existing Worker versions. The legacy credential moves into the channel account, so rolling back to pre-migration code also requires a coordinated database recovery; do not roll back the old Edge Worker alone. Deployment receipts belong in the project handoff.
