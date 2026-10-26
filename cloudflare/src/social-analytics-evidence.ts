import { socialDifference, type SocialAccount, type SocialChatAnswer, type SocialEntity, type SocialEvidence, type SocialMetric, type SocialQueryPlan } from './social-analytics-contracts.ts';
import { type SocialProvider, type SocialPost, ZernioError } from './social-analytics-provider.ts';
export type SocialWorkspace = {
    profileId: string;
    profileName?: string;
    accounts: SocialAccount[];
};
const units = (metric: SocialMetric) => metric === 'engagementRate' ? '%' : 'count';
export function emptySocialAnswer(plan: Pick<SocialQueryPlan, 'fromDate' | 'toDate' | 'platforms'>, summary: string, retryable = false): SocialChatAnswer {
    return { status: 'unavailable', scope: { platform: plan.platforms.length === 1 ? plan.platforms[0] : 'all', fromDate: plan.fromDate, toDate: plan.toDate }, summary, columns: [], rows: [], evidence: [], entities: [], limitations: [], retryable };
}
const entityForPost = (post: SocialPost): SocialEntity => ({ kind: 'post', platform: post.platform, id: post.id, label: post.label, ...(post.accountId ? { accountId: post.accountId } : {}), ...(post.url ? { url: post.url } : {}) });
const normalized = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
function editDistance(a: string, b: string) {
    let row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const next = [i];
        for (let j = 1; j <= b.length; j++)
            next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        row = next;
    }
    return row[b.length];
}
export function resolveSocialPost(posts: SocialPost[], ref: {
    id?: string;
    query?: string;
    platform?: string;
    accountId?: string;
}) {
    const candidates = posts.filter(p => (!ref.platform || p.platform === ref.platform) && (!ref.accountId || p.accountId === ref.accountId));
    if (ref.id)
        return candidates.filter(p => p.id === ref.id);
    const q = normalized(ref.query ?? '');
    if (!q)
        return [];
    const exact = candidates.filter(p => normalized(p.label).includes(q));
    if (exact.length)
        return exact;
    const words = q.split(' ').filter(w => w.length > 2);
    if (!words.length)
        return [];
    return candidates.filter(p => { const title = normalized(p.label).split(' '); return words.every(w => title.some(t => t === w || (w.length >= 5 && editDistance(w, t) <= 1))); });
}
export async function executeSocialPlan(provider: SocialProvider, workspace: SocialWorkspace, plan: SocialQueryPlan): Promise<SocialChatAnswer> {
    const answer = emptySocialAnswer(plan, 'Analytics for the selected scope.');
    if (plan.intent === 'clarification')
        return { ...answer, status: 'clarification_required', summary: plan.clarification ?? 'Choose a metric and the platforms or posts to compare.' };
    if (['ranking', 'trend'].includes(plan.intent) && plan.metrics.length !== 1)
        return { ...answer, status:'clarification_required', summary:'Choose one metric for this ranking or trend, such as views, shares or follower growth.' };
    if (plan.basis === 'matched_age')
        return { ...answer, summary: 'Matched-age history is not available here. Ask for a lifetime post comparison or a calendar-period comparison.' };
    if (plan.target === 'post' && ['period_comparison','trend'].includes(plan.intent))
        return {...answer, summary:'Daily or period-specific post history is not available in this query. Ask for lifetime post performance, or compare platform totals over these dates.'};
    const fetchedAt = new Date().toISOString();
    if (plan.toDate === fetchedAt.slice(0, 10))
        answer.limitations.push('Today is incomplete; provider reporting may lag.');
    if (plan.platforms.length > 1)
        answer.limitations.push('Platform definitions differ. Compare directionally; reach is not unique people across networks. Engagement rates may use different denominators.');
    let failures = 0;
    let incomplete = false;
    const evidence = (entity: SocialEntity, metric: SocialMetric, value: number | null, basis: string, fromDate: string, toDate: string, dataAsOf: string | null, reason?: string): SocialEvidence => ({ entity, metric, value, unit: units(metric), basis, fromDate, toDate, fetchedAt, dataAsOf, ...(reason ? { reason } : value === null ? { reason: 'Metric not returned for this scope.' } : {}), ...(entity.url ? { sourceUrl: entity.url } : {}) });
    const available = plan.platforms.filter(platform => {
        const accounts = workspace.accounts.filter(a => a.platform === platform && a.isActive);
        if (!accounts.length || accounts.every(a => a.hasAnalyticsAccess === false)) {
            answer.limitations.push(`${platform}: ${accounts.length ? 'analytics permission missing' : 'not connected'}.`);
            failures++;
            return false;
        }
        return true;
    });
    if (plan.target === 'post' || plan.intent === 'post_comparison') {
        answer.limitations.push('Post metrics are lifetime-to-date for posts published in the selected dates, not activity received during that period.');
        if (plan.metrics.some(m => m === 'followers' || m === 'followersGained'))
            return { ...answer, summary: 'Follower counts and growth are account metrics. Post-attributed follower changes are not available in this query.' };
        if (!available.length)
            return { ...answer, summary: 'No selected platforms have an active analytics connection.' };
        const posts: SocialPost[] = [];
        let complete = true;
        let pages = 0;
        // One profile-scoped list avoids an unverified post-ID lookup and cross-workspace leakage.
        try {
            while (pages < 5) {
                const result = await provider.posts(workspace.profileId, { fromDate: plan.fromDate, toDate: plan.toDate, ...(available.length === 1 ? { platform: available[0] } : {}), sortBy: plan.intent === 'ranking' && plan.metrics[0] !== 'engagementRate' ? plan.metrics[0] : 'date', order: plan.order, page: ++pages });
                for (const post of result.posts)
                    if (available.includes(post.platform) && post.accountId && workspace.accounts.some(a => a.id === post.accountId && a.platform === post.platform && a.isActive && a.hasAnalyticsAccess !== false) && !posts.some(p => p.id === post.id && p.platform === post.platform && p.accountId === post.accountId))
                        posts.push(post);
                complete = result.complete;
                if (complete)
                    break;
            }
        }
        catch (error) {
            failures++;
            complete = false;
            answer.limitations.push(error instanceof ZernioError ? error.message : 'Post analytics could not be retrieved.');
        }
        if (!complete)
            answer.limitations.push('Incomplete post coverage: results cover only the retrieved pages, not a global winner. Narrow the dates for full coverage.');
        if (plan.intent === 'ranking') {
            const metric = plan.metrics[0];
            if(posts.some(p => p.metrics[metric as keyof typeof p.metrics] == null)) { incomplete=true;answer.limitations.push('Posts with unavailable metrics were excluded from the ranking.'); }
            const ranked = posts.filter(p => p.metrics[metric as keyof typeof p.metrics] != null).sort((a, b) => (a.metrics[metric as keyof typeof a.metrics]! - b.metrics[metric as keyof typeof b.metrics]!) * (plan.order === 'asc' ? 1 : -1)).slice(0, plan.limit);
            answer.columns = [metric];
            answer.entities = ranked.map(entityForPost);
            answer.rows = ranked.map(p => ({ label: p.label, values: [p.metrics[metric as keyof typeof p.metrics]], unit: units(metric) }));
            answer.evidence = ranked.map(p => evidence(entityForPost(p), metric, p.metrics[metric as keyof typeof p.metrics], 'lifetime', plan.fromDate, plan.toDate, p.dataAsOf));
            answer.summary = `${complete ? 'Ranked posts' : 'Ranked retrieved posts'} by ${metric}.`;
        }
        else {
            const chosen: SocialPost[] = [];
            for (const ref of plan.posts) {
                const matches = resolveSocialPost(posts, ref);
                if (matches.length !== 1)
                    return { ...answer, status: 'clarification_required', summary: matches.length ? 'Several posts match. Choose the intended post and platform.' : 'That post was not found in the authorized accounts and publication dates. Choose a post or change the date range.', candidates: (matches.length ? matches : posts).slice(0, 10).map(entityForPost) };
                chosen.push(matches[0]);
            }
            if (!chosen.length)
                return { ...answer, status: 'clarification_required', summary: 'Which post should I inspect? Choose one below.', candidates: posts.slice(0, 10).map(entityForPost) };
            answer.entities = chosen.map(entityForPost);
            answer.columns = chosen.map(p => p.label);
            answer.rows = plan.metrics.map(metric => { const values = chosen.map(p => p.metrics[metric as keyof typeof p.metrics] ?? null); return { label: metric, values, unit: units(metric), ...(values.length === 2 ? socialDifference(values[0], values[1], metric === 'engagementRate') : {}) }; });
            answer.evidence = chosen.flatMap(p => plan.metrics.map(m => evidence(entityForPost(p), m, p.metrics[m as keyof typeof p.metrics] ?? null, 'lifetime', plan.fromDate, plan.toDate, p.dataAsOf)));
            answer.summary = chosen.length === 1 ? `Performance of ${chosen[0].label}.` : 'Lifetime post comparison. Differences show the first post minus the second.';
        }
    }
    else {
        const periods = [{ fromDate: plan.fromDate, toDate: plan.toDate }];
        if (plan.intent === 'period_comparison') {
            const days = (Date.parse(plan.toDate) - Date.parse(plan.fromDate)) / 86400000 + 1;
            const end = new Date(Date.parse(plan.fromDate) - 86400000);
            const start = new Date(end.getTime() - (days - 1) * 86400000);
            periods.push(plan.previous ?? { fromDate: start.toISOString().slice(0, 10), toDate: end.toISOString().slice(0, 10) });
        }
        const results: {
            entity: SocialEntity;
            period: typeof periods[number];
            data: Awaited<ReturnType<SocialProvider['dashboard']>> | null;
            reason?: string;
        }[] = [];
        const jobs = plan.platforms.flatMap(platform => periods.map(period => ({ platform, period })));
        // Three bounded workers share the provider's request and wall-clock budget.
        let cursor = 0;
        await Promise.all(Array.from({ length: Math.min(3, jobs.length) }, async () => {
            while (cursor < jobs.length) {
                const index = cursor++;
                const { platform, period } = jobs[index];
                const entity: SocialEntity = { kind: 'platform', platform, id: platform, label: platform };
                try {
                    if (!available.includes(platform))
                        throw new ZernioError('Not connected or analytics permission missing.', 403, 'not_connected');
                    results[index] = { entity, period, data: await provider.dashboard(workspace.profileId, { platform, ...period }) };
                }
                catch (error) {
                    failures++;
                    results[index] = { entity, period, data: null, reason: error instanceof ZernioError ? error.message : 'Provider unavailable.' };
                    answer.limitations.push(`${platform}: ${results[index].reason}`);
                }
            }
        }));
        answer.entities = plan.platforms.map(platform => ({ kind: 'platform', platform, id: platform, label: platform }));
        answer.columns = results.map(r => `${r.entity.label}${periods.length > 1 ? ` · ${r.period.fromDate}–${r.period.toDate}` : ''}`);
        if (plan.intent === 'trend') {
            if (plan.metrics.some(m => !['impressions', 'reach', 'views', 'followersGained'].includes(m)))
                return { ...answer, summary: 'Daily observations support impressions, reach, views and follower growth. Choose one of these metrics.' };
            const metric = plan.metrics[0] as 'impressions' | 'reach' | 'views' | 'followersGained';
            const dates = [...new Set(results.flatMap(r => r.data?.daily.map(d => d.date) ?? []))].sort();
            if (dates.length > 10)
                answer.limitations.push('Showing the latest 10 reported days. Narrow the dates to see earlier days.');
            answer.rows = dates.slice(-10).map(date => ({ label: date, unit: units(metric), values: results.map(r => r.data?.daily.find(d => d.date === date)?.[metric] ?? null) }));
            answer.evidence = results.flatMap(r => dates.slice(-10).map(date => evidence(r.entity, metric, r.data?.daily.find(d => d.date === date)?.[metric] ?? null, 'received_period', date, date, r.data?.dataAsOf ?? null, r.reason)));
            answer.summary = `Daily ${metric} observations.`;
        }
        else {
            const value = (r: typeof results[number], m: SocialMetric) => m === 'followers' ? r.data?.followers.current ?? null : m === 'followersGained' ? r.data?.followers.gained ?? null : r.data?.totals[m] ?? null;
            answer.rows = plan.metrics.map(m => { const values = results.map(r => value(r, m)); return { label: m, values, unit: units(m), ...(values.length === 2 ? socialDifference(values[0], values[1], m === 'engagementRate') : {}) }; });
            if (periods.length === 2) {
                answer.columns = periods.map((p, i) => `${i === 0 ? 'Current' : 'Previous'} · ${p.fromDate}–${p.toDate}`);
                const rows = plan.platforms.flatMap((platform, i) => plan.metrics.map(metric => {
                    const values = [value(results[i*2], metric), value(results[i*2+1], metric)];
                    return {label: plan.platforms.length === 1 ? metric : `${platform} · ${metric}`, values, unit:units(metric), ...socialDifference(values[0], values[1], metric === 'engagementRate')};
                }));
                answer.rows = rows.slice(0, 10);
                if (rows.length > 10) answer.limitations.push('Showing the first 10 platform/metric comparisons. Ask for fewer metrics or platforms to see the remaining comparisons.');
            }
            answer.evidence = results.flatMap(r => plan.metrics.map(m => evidence(r.entity, m, value(r, m), m === 'followers' ? (r.period.toDate === fetchedAt.slice(0, 10) ? 'current_snapshot' : 'period_end_snapshot') : m === 'followersGained' ? 'last_minus_first_snapshot_in_window' : 'received_period', r.period.fromDate, r.period.toDate, r.data?.dataAsOf ?? null, r.reason)));
            answer.summary = plan.intent === 'period_comparison' ? 'Period comparison. Differences show current minus previous.' : plan.platforms.length > 1 ? 'Platform performance for matching dates. Differences show first minus second.' : 'Performance for the selected dates.';
            if (plan.intent === 'ranking') {
                const metric = plan.metrics[0];
                if(results.some(r => value(r,metric) === null)) { incomplete=true;answer.limitations.push('Platforms with unavailable metrics were excluded from the ranking.'); }
                const ranked = results.filter(r => value(r, metric) !== null).sort((a, b) => (value(a, metric)! - value(b, metric)!) * (plan.order === 'asc' ? 1 : -1)).slice(0, plan.limit);
                answer.columns = [metric];
                answer.rows = ranked.map(r => ({ label: r.entity.label, values: [value(r, metric)], unit: units(metric) }));
                answer.entities = ranked.map(r => r.entity);
                answer.summary = `Connected platforms ranked by ${metric}.`;
            }
        }
    }
    if (answer.rows.some(r => r.values.length === 2 && r.values[1] === 0 && r.unit !== '%'))
        answer.limitations.push('Percentage change unavailable where the comparison has a zero baseline.');
    if (answer.rows.some(r => r.unit === '%' && r.values.length === 2))
        answer.limitations.push('Rate differences are percentage points, not percentage growth.');
    const values = answer.rows.flatMap(r => r.values);
    answer.status = !values.some(v => v !== null) ? 'unavailable' : failures || incomplete || values.some(v => v === null) || answer.limitations.some(s => s.startsWith('Incomplete')) ? 'partial' : 'answered';
    if (answer.status === 'unavailable')
        answer.summary = 'No reported metrics were available for this scope. Check connections, reporting access and dates.';
    if (answer.status !== 'unavailable' && answer.rows.length) {
        const changes = answer.rows.filter(r => r.difference != null).slice(0, 3);
        if (changes.length)
            answer.summary += ' ' + changes.map(r => `${r.label}: ${r.difference! >= 0 ? '+' : ''}${Number(r.difference!.toFixed(2)).toLocaleString('en-US')}${r.unit === '%' ? ' percentage points' : ''}.`).join(' ');
    }
    answer.retryable = failures > 0;
    answer.limitations = [...new Set(answer.limitations)];
    return answer;
}
