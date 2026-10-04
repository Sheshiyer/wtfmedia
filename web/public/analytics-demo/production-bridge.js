/* OAuth-backed production adapter for the imported YouTube decision workspace. */
(() => {
  const parameters = new URLSearchParams(window.location.search);
  const canManage = parameters.get('manage') === '1';
  const api = {
    configured: false,
    migrationRequired: false,
    connection: null,
    report: null,
    reportKey: '',
    reportLoading: false,
    comparison: null,
    comparisonKey: '',
    comparisonLoading: false,
    retention: null,
    retentionKey: '',
    retentionLoading: false,
    notice: 'Checking your YouTube connection.',
  };

  const priorRender = render;
  const isNumber = value => typeof value === 'number' && Number.isFinite(value);
  const observed = value => isNumber(value) ? value : undefined;
  const ratio = (numerator, denominator) => isNumber(numerator) && isNumber(denominator) && denominator > 0 ? numerator / denominator : undefined;
  const shift = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const safe = value => escapeHtml(value == null ? 'unavailable' : value);

  function monthRange(endDate, offset) {
    const date = new Date(`${endDate}T00:00:00Z`);
    const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - offset, 1));
    const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
    const from = first.toISOString().slice(0, 10);
    const to = (last > date ? date : last).toISOString().slice(0, 10);
    const label = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);
    return { label, short: label, from, to };
  }

  function configureRanges(endDate = today) {
    presets.latest = { label: `Last 7 days · ${pretty(shift(endDate, -6))}–${pretty(endDate)}`, short: 'last 7 days', from: shift(endDate, -6), to: endDate };
    presets.last28 = { label: `Last 28 days · ${pretty(shift(endDate, -27))}–${pretty(endDate)}`, short: 'last 28 days', from: shift(endDate, -27), to: endDate };
    ['june', 'july', 'august', 'september'].forEach((key, index) => {
      presets[key] = monthRange(endDate, 3 - index);
      const button = document.querySelector(`[data-range="${key}"]`);
      if (button) button.textContent = presets[key].label;
    });
    presets.all = { label: `Last 365 days · through ${pretty(endDate)}`, short: 'last 365 days', from: shift(endDate, -364), to: endDate };
    const latest = document.querySelector('[data-range="latest"]');
    const last28 = document.querySelector('[data-range="last28"]');
    const all = document.querySelector('[data-range="all"]');
    if (latest) latest.textContent = 'Last 7 days';
    if (last28) last28.textContent = 'Last 28 days';
    if (all) all.textContent = 'Last 365 days';
    ['#range-start', '#range-end'].forEach(selector => {
      const input = $(selector);
      input.min = presets.all.from;
      input.max = endDate;
    });
    Object.assign(state, { range: 'last28', start: presets.last28.from, end: presets.last28.to });
  }

  function clearProviderData() {
    weekly.splice(0, weekly.length);
    episodes.splice(0, episodes.length);
    state.episode = 'all';
    state.compareEpisode = '';
    api.report = null;
    api.comparison = null;
    api.retention = null;
  }

  function dailyObservation(row) {
    const views = observed(row.views);
    const subscribers = observed(row.subscribersGained);
    const subscribed = observed(row.subscribedViews);
    const unsubscribed = observed(row.unsubscribedViews);
    return {
      date: new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${row.date}T00:00:00Z`)),
      iso: row.date,
      views,
      watch: isNumber(row.watchMinutes) ? row.watchMinutes / 60 : undefined,
      subscribers,
      impressions: observed(row.impressions),
      ctr: observed(row.impressionsCtr),
      avd: observed(row.averageViewDurationSeconds),
      retention: isNumber(row.averageViewPercentage) ? row.averageViewPercentage / 100 : undefined,
      subscribed,
      unsubscribed,
      unsubPct: ratio(unsubscribed, isNumber(subscribed) && isNumber(unsubscribed) ? subscribed + unsubscribed : undefined),
      stv: ratio(subscribers, views),
      conversion: ratio(subscribers, unsubscribed),
    };
  }

  function videoObservation(row) {
    const views = observed(row.views);
    const subscribers = observed(row.subscribersGained);
    const impressions = observed(row.impressions);
    const ctrRatio = observed(row.impressionsCtr);
    return {
      id: String(row.videoId),
      name: String(row.title || row.videoId),
      series: String(row.contentType || 'YouTube video'),
      publishedAt: row.publishedAt || null,
      views,
      watch: isNumber(row.watchMinutes) ? row.watchMinutes / 60 : undefined,
      impressions,
      ctr: isNumber(ctrRatio) ? ctrRatio * 100 : undefined,
      subscribers,
      avd: observed(row.averageViewDurationSeconds),
      retention: isNumber(row.averageViewPercentage) ? row.averageViewPercentage / 100 : undefined,
      stv: ratio(subscribers, views),
      clicks: observed(row.estimatedImpressionClicks) ?? (isNumber(impressions) && isNumber(ctrRatio) ? impressions * ctrRatio : undefined),
      impressionTier: row.impressionTier || null,
      performanceGroup: row.performanceGroup || null,
    };
  }

  function applyReport(report) {
    weekly.splice(0, weekly.length, ...(Array.isArray(report.trends) ? report.trends.map(dailyObservation) : []));
    episodes.splice(0, episodes.length, ...(Array.isArray(report.videos) ? report.videos.map(videoObservation) : []));
    api.report = report;
    liveDemoState.connected = true;
    if (!episodes.some(item => item.id === state.episode)) state.episode = episodes[0]?.id || 'all';
    if (!episodes.some(item => item.id === state.compareEpisode) || state.compareEpisode === state.episode) state.compareEpisode = episodes.find(item => item.id !== state.episode)?.id || '';
  }

  async function request(path, options) {
    const response = await (globalThis.wtfAnalyticsRequest || fetch)(path, { cache: 'no-store', ...options });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(response.status === 401 ? "Your session expired. Please sign in again." : response.status === 403 ? "You do not have permission to manage this channel." : "We could not complete this request. Please try again.");
    return payload;
  }

  function connectionStatus() {
    const connection = api.connection;
    if (api.migrationRequired) return ['Connection unavailable', 'Channel connection is temporarily unavailable. Please contact your administrator.'];
    if (!api.configured) return ['Connection unavailable', 'Google connection is not available yet. Please contact your administrator.'];
    if (!connection) return ['Google not connected', 'Connect the Google account that manages your channel. Access is read-only.'];
    if (!connection.resource) return ['Select the channel', 'Google is connected. Select your YouTube channel to continue.'];
    if (connection.status !== 'connected') return [String(connection.status).replaceAll('_', ' '), 'Reconnect Google before synchronizing provider observations.'];
    return [connection.resource.name || connection.resource.id, 'Your channel is connected. Update data to see the latest results.'];
  }

  function renderProductionStatus() {
    const [title, copy] = connectionStatus();
    const connected = Boolean(api.connection?.resource && api.connection.status === 'connected');
    $('#api-status-dot').classList.toggle('connected', connected);
    $('#api-status-title').textContent = title;
    $('#api-status-copy').textContent = copy;
    $('#header-data-state').textContent = connected ? `OAuth data · ${api.report?.freshness ? `synced ${api.report.freshness}` : 'awaiting sync'}` : title;
    $('#trust-connection').textContent = connected ? `YouTube · ${api.connection.resource.name || api.connection.resource.id}` : title;
    $('#trust-sync').textContent = api.report?.freshness || api.connection?.lastSuccessfulRefreshAt || 'No successful synchronization';
    const coverage = api.report?.coverage;
    if (coverage) $('#trust-coverage').textContent = `${coverage.observedDays || 0}/${coverage.requestedDays || 0} daily rows · ${coverage.reach?.observedDays || 0} reach days`;
    if (!api.report) $('#coverage-note').textContent = 'No synchronized provider observations in this selected scope.';
    $('#api-action-status').textContent = api.notice;
    const connect = $('#api-connect-demo');
    const form = $('#api-channel-form');
    const sync = $('#api-sync-production');
    const refresh = $('#api-refresh-production');
    [connect, sync, refresh].forEach(button => { button.hidden = !canManage; });
    form.hidden = !canManage || !api.connection;
    connect.disabled = !api.configured || api.reportLoading;
    connect.textContent = api.connection ? 'reconnect Google →' : 'connect Google →';
    sync.disabled = !connected || api.reportLoading;
    refresh.disabled = !connected || api.reportLoading;
    if (api.connection?.resource) {
      $('#api-channel-id').value = api.connection.resource.id || '';
      $('#api-timezone').value = api.connection.resource.timezone || 'UTC';
    }
    document.querySelectorAll('.answer-confidence').forEach(node => { node.textContent = api.report ? 'CONFIDENCE · STORED PROVIDER OBSERVATIONS' : 'CONFIDENCE · PROVIDER DATA UNAVAILABLE'; });
    const episodeCopy = document.querySelector('#episodes .section-title > p');
    if (episodeCopy) episodeCopy.textContent = api.report ? 'Choose an episode to review its performance.' : 'No synchronized episode observations available.';
  }

  function setBusy(value, notice) {
    api.reportLoading = value;
    if (notice) api.notice = notice;
    renderProductionStatus();
  }

  async function loadStatus() {
    try {
      const result = await request('/beta/api/analytics/status');
      api.configured = Boolean(result.configured);
      api.migrationRequired = Boolean(result.migrationRequired);
      api.connection = Array.isArray(result.connections) ? result.connections.find(item => item.provider === 'youtube') || null : null;
      if (!api.connection?.resource) {
        clearProviderData();
        api.notice = api.migrationRequired ? 'Channel connection is temporarily unavailable.' : api.configured ? 'Connect Google and select the authorized channel.' : 'Google connection is not available yet. Please contact your administrator.';
        render();
        return;
      }
      api.notice = 'Loading your channel’s data.';
      render();
      await loadReport(true);
    } catch (error) {
      clearProviderData();
      api.notice = `Connection state unavailable · ${error.message}`;
      render();
    }
  }

  function currentRangeKey() {
    const selected = range();
    return `${selected.from}:${selected.to}`;
  }

  async function loadReport(force = false) {
    if (!api.connection?.resource || api.reportLoading) return;
    const selected = range();
    const key = currentRangeKey();
    if (!force && api.reportKey === key) return;
    api.reportKey = key;
    setBusy(true, `Loading stored YouTube observations for ${selected.label}.`);
    weekly.splice(0, weekly.length);
    episodes.splice(0, episodes.length);
    priorRender();
    renderProductionStatus();
    try {
      const query = new URLSearchParams({ startDate: selected.from, endDate: selected.to });
      const report = await request(`/beta/api/analytics/youtube?${query}`);
      applyReport(report);
      api.notice = report.trends?.length ? 'Stored YouTube observations loaded.' : 'The selected channel is connected, but this date range has no synchronized observations.';
    } catch (error) {
      clearProviderData();
      api.notice = `Stored report unavailable · ${error.message}`;
    } finally {
      api.reportLoading = false;
      render();
    }
  }

  async function connectGoogle() {
    if (!canManage || !api.configured) return;
    setBusy(true, 'Opening Google sign-in…');
    try {
      const result = await request('/beta/api/analytics/oauth/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: 'youtube', returnPath: '/beta/analytics' }),
      });
      window.top.location.assign(result.authorizationUrl);
    } catch (error) {
      setBusy(false, `Google sign-in could not open · ${error.message}`);
    }
  }

  async function selectChannel(event) {
    event.preventDefault();
    if (!canManage) return;
    const resourceId = $('#api-channel-id').value.trim();
    const timezone = $('#api-timezone').value.trim() || 'UTC';
    setBusy(true, 'Verifying channel ownership with Google.');
    try {
      await request('/beta/api/analytics/selection', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: 'youtube', resourceId, timezone }),
      });
      api.notice = 'Channel verified and selected.';
      api.reportLoading = false;
      await loadStatus();
    } catch (error) {
      setBusy(false, `Channel selection failed · ${error.message}`);
    }
  }

  async function synchronize() {
    if (!canManage || !api.connection?.resource) return;
    const selected = range();
    setBusy(true, `Synchronizing ${selected.label}.`);
    try {
      const result = await request('/beta/api/analytics/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: 'youtube', startDate: selected.from, endDate: selected.to }),
      });
      api.reportKey = '';
      api.notice = `Synchronization ${result.sync?.status || 'completed'} · ${result.sync?.rows ?? 0} stored observations.`;
      api.reportLoading = false;
      await loadStatus();
    } catch (error) {
      setBusy(false, `Synchronization failed · ${error.message}`);
    }
  }

  function comparisonMetric(value, formatter) {
    return isNumber(value) ? formatter(value) : 'unavailable';
  }

  function applyProductionComparison() {
    const result = api.comparison;
    if (!result || api.comparisonKey !== comparisonKey()) return;
    const a = result.episodeA;
    const b = result.episodeB;
    const rows = [
      ['Views', comparisonMetric(a.views, num), comparisonMetric(b.views, num), result.deviations?.views?.relative, '%'],
      ['Impressions', comparisonMetric(a.impressions, num), comparisonMetric(b.impressions, num), result.deviations?.impressions?.relative, '%'],
      ['CTR', comparisonMetric(a.impressionsCtr, value => rate(value)), comparisonMetric(b.impressionsCtr, value => rate(value)), result.deviations?.impressionsCtr?.absolute, ' pp'],
      ['Average view duration', comparisonMetric(a.averageViewDurationSeconds, time), comparisonMetric(b.averageViewDurationSeconds, time), result.deviations?.averageViewDurationSeconds?.absolute, ' sec'],
      ['Retention', comparisonMetric(a.averageViewPercentage, value => `${value.toFixed(1)}%`), comparisonMetric(b.averageViewPercentage, value => `${value.toFixed(1)}%`), result.deviations?.averageViewPercentage?.absolute, ' pp'],
      ['Subscribers', comparisonMetric(a.subscribersGained, exact), comparisonMetric(b.subscribersGained, exact), result.deviations?.subscribersGained?.relative, '%'],
      ['Subscribers / 1M impressions', comparisonMetric(a.subscribersPerMillionImpressions, value => value.toFixed(1)), comparisonMetric(b.subscribersPerMillionImpressions, value => value.toFixed(1)), result.deviations?.subscribersPerMillionImpressions?.relative, '%'],
    ];
    $('#episode-detail').innerHTML = `<section class="head-to-head" aria-label="${safe(a.title)} compared with ${safe(b.title)}"><div class="comparison-hero"><article class="episode-a"><span>EPISODE A</span><h3>${safe(a.title)}</h3><small>${safe(result.window)} · ${safe(a.range?.startDate)}–${safe(a.range?.endDate)}</small></article><b class="versus">VS</b><article class="episode-b"><span>EPISODE B</span><h3>${safe(b.title)}</h3><small>${safe(result.window)} · ${safe(b.range?.startDate)}–${safe(b.range?.endDate)}</small></article></div><div class="comparison-table-wrap"><table class="comparison-table"><thead><tr><th>Metric</th><th>${safe(a.title)}</th><th>Difference A vs B</th><th>${safe(b.title)}</th></tr></thead><tbody>${rows.map(([label, left, right, difference, unit]) => `<tr><th>${label}</th><td><strong>${left}</strong></td><td><span class="comparison-delta ${isNumber(difference) && difference >= 0 ? 'ahead' : 'behind'}">${isNumber(difference) ? signed(unit === ' pp' || unit === ' sec' ? difference : difference * 100, unit) : 'unavailable'}</span></td><td><strong>${right}</strong></td></tr>`).join('')}</tbody></table></div><div class="comparison-boundary"><b>PRODUCTION COMPARISON</b><p>${result.sameAgeGuard ? 'Both episodes use the same post-publish window.' : 'Lifetime values use every stored observation and are not age matched.'} Formula contract: ${safe(result.formulaVersion)}.</p></div></section>`;
  }

  function comparisonKey() {
    return state.cohort === 'episode' && state.episode !== 'all' && state.compareEpisode ? `${state.episode}:${state.compareEpisode}:${state.episodeWindow}` : '';
  }

  async function loadComparison() {
    const key = comparisonKey();
    if (!key || api.comparisonLoading || api.comparisonKey === key) return;
    api.comparisonKey = key;
    api.comparisonLoading = true;
    api.comparison = null;
    try {
      const query = new URLSearchParams({ videoA: state.episode, videoB: state.compareEpisode, window: state.episodeWindow });
      api.comparison = await request(`/beta/api/analytics/youtube/episodes/compare?${query}`);
    } catch (error) {
      api.notice = `Matched episode comparison unavailable · ${error.message}`;
    } finally {
      api.comparisonLoading = false;
      render();
    }
  }

  function retentionKey() {
    const selected = range();
    return state.episode !== 'all' ? `${state.episode}:${selected.from}:${selected.to}` : '';
  }

  function renderRetention() {
    const key = retentionKey();
    if (!key || !$('#episode-detail')) return;
    const result = api.retentionKey === key ? api.retention : null;
    const points = Array.isArray(result?.points) ? result.points.filter(point => isNumber(point.elapsedVideoTimeRatio) && isNumber(point.audienceWatchRatio)) : [];
    const max = Math.max(1, ...points.map(point => point.audienceWatchRatio));
    const path = points.map(point => `${(point.elapsedVideoTimeRatio * 100).toFixed(2)},${(70 - point.audienceWatchRatio / max * 64).toFixed(2)}`).join(' ');
    const status = api.retentionLoading ? 'Loading stored curve' : points.length ? `${points.length} retention points` : result?.status === 'not_synced' ? 'Retention has not been synchronized' : 'Retention unavailable for this range';
    $('#episode-detail').insertAdjacentHTML('beforeend', `<section class="production-retention"><div><span>AUDIENCE RETENTION</span><strong>${safe(status)}</strong><small>${safe(result?.video?.title || ep()?.name || state.episode)}</small></div><svg viewBox="0 0 100 76" role="img" aria-label="Audience retention curve">${path ? `<polyline points="${path}" fill="none" stroke="#2862d9" stroke-width="2" vector-effect="non-scaling-stroke"/>` : ''}</svg>${canManage ? '<button id="api-sync-retention" type="button">sync retention →</button>' : '<small>Admin authority is required to synchronize retention.</small>'}</section>`);
    const button = $('#api-sync-retention');
    if (button) { button.disabled = api.retentionLoading; button.onclick = synchronizeRetention; }
  }

  async function loadRetention(force = false) {
    const key = retentionKey();
    if (!key || api.retentionLoading || (!force && api.retentionKey === key)) return;
    api.retentionKey = key;
    api.retentionLoading = true;
    const selected = range();
    try {
      const query = new URLSearchParams({ videoId: state.episode, startDate: selected.from, endDate: selected.to });
      api.retention = await request(`/beta/api/analytics/youtube/retention?${query}`);
    } catch (error) {
      api.retention = null;
      api.notice = `Retention unavailable · ${error.message}`;
    } finally {
      api.retentionLoading = false;
      render();
    }
  }

  async function synchronizeRetention() {
    if (!canManage || state.episode === 'all') return;
    const selected = range();
    api.retentionLoading = true;
    render();
    try {
      await request('/beta/api/analytics/youtube/retention', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ videoId: state.episode, startDate: selected.from, endDate: selected.to }),
      });
      api.retentionKey = '';
      api.retentionLoading = false;
      api.notice = 'Retention synchronized for the selected episode and date range.';
      await loadRetention(true);
    } catch (error) {
      api.retentionLoading = false;
      api.notice = `Retention synchronization failed · ${error.message}`;
      render();
    }
  }

  function wireProductionControls() {
    $('#api-connect-demo').onclick = connectGoogle;
    $('#api-channel-form').onsubmit = selectChannel;
    $('#api-sync-production').onclick = synchronize;
    $('#api-refresh-production').onclick = () => { api.reportKey = ''; void loadReport(true); };
  }

  render = function productionRender() {
    priorRender();
    applyProductionComparison();
    renderRetention();
    renderProductionStatus();
    wireProductionControls();
    if (api.connection?.resource && !api.reportLoading && api.reportKey !== currentRangeKey()) queueMicrotask(() => void loadReport());
    if (api.report && comparisonKey() && api.comparisonKey !== comparisonKey()) queueMicrotask(() => void loadComparison());
    if (api.report && retentionKey() && api.retentionKey !== retentionKey()) queueMicrotask(() => void loadRetention());
  };

  configureRanges(today);
  clearProviderData();
  render();
  void loadStatus();
})();
