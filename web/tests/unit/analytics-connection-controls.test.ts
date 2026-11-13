import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

function controls(manage: boolean, serverManage = manage, all = false) {
  const nodes = new Map<string, { hidden: boolean; disabled: boolean; textContent: string; setAttribute: ReturnType<typeof vi.fn>; classList: { toggle: ReturnType<typeof vi.fn> } }>();
  const node = (selector: string) => {
    if (!nodes.has(selector)) nodes.set(selector, { hidden: false, disabled: false, textContent: '', setAttribute: vi.fn(), classList: { toggle: vi.fn() } });
    return nodes.get(selector)!;
  };
  const context = vm.createContext({ URLSearchParams, window: { location: { search: `?manage=${manage ? 1 : 0}&channel=${all ? "all" : `UC${"a".repeat(22)}`}` } },
    render: vi.fn(), weekly: [], episodes: [], state: {}, fetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({configured: true, canManage: serverManage, connections: []}) }), $: node, document: { querySelectorAll: () => [], querySelector: () => null } });
  const source = readFileSync('public/analytics-demo/production-bridge.js', 'utf8');
  vm.runInContext(source.replace('  configureRanges(today);', '  globalThis.testControls = { api, renderProductionStatus, loadStatus }; return;\n  configureRanges(today);'), context);
  const { api, renderProductionStatus: render, loadStatus } = context.testControls;
  context.render = vi.fn();
  api.configured = true;
  api.notice = 'Connect Google and select the authorized channel.';
  return { api, render, node, loadStatus };
}

describe('analytics connection permissions', () => {
  it('shows connect for admins and explains why readers cannot connect', () => {
    const admin = controls(true); admin.render();
    expect(admin.node('#api-connect-demo').hidden).toBe(false);
    expect(admin.node('#api-connect-demo').disabled).toBe(false);
    const reader = controls(false); reader.render();
    expect(reader.node('#api-connect-demo').hidden).toBe(true);
    expect(reader.node('#api-action-status').textContent).toContain('Ask a workspace admin');
    expect(reader.node('#api-status-copy').textContent).toContain('workspace admins');
    expect(reader.node('#api-channel-form').hidden).toBe(true);
  });
  it('keeps reader management controls hidden for an existing connection', () => {
    const reader = controls(false);
    reader.api.connection = { status: 'connected', resource: { id: 'channel', name: 'Channel' } };
    reader.api.notice = 'Your data is up to date.';
    reader.render();
    for (const selector of ['#api-connect-demo', '#api-disconnect', '#api-sync-production', '#api-channel-form']) expect(reader.node(selector).hidden).toBe(true);
    expect(reader.node('#api-action-status').textContent).toBe('Your data is up to date.');
    const admin = controls(true); admin.api.connection = reader.api.connection; admin.render();
    expect(admin.node('#api-disconnect').hidden).toBe(false);
    expect(admin.node('#api-sync-production').hidden).toBe(false);
  });
  it('preserves configuration errors instead of telling a reader to connect', () => {
    const reader = controls(false); reader.api.configured = false;
    reader.api.notice = 'Google connection is not available yet.'; reader.render();
    expect(reader.node('#api-action-status').textContent).toBe(reader.api.notice);
  });
});

it.each([[false, true], [true, false]])('refreshes stale management hint %s with server permission %s', async (hint, permission) => {
  const view = controls(hint, permission);
  await view.loadStatus(); view.render();
  expect(view.node('#api-connect-demo').hidden).toBe(!permission);
});


it('keeps reconnect available at capacity, including expired grants, while readers cannot manage', () => {
  for (const status of ['connected', 'expired']) {
    const admin = controls(true);
    admin.api.accountCount = 3;
    admin.api.connection = { status, resource: { id: 'channel', name: 'Channel' } };
    admin.render();
    expect(admin.node('#api-connect-demo').hidden).toBe(false);
    expect(admin.node('#api-connect-demo').disabled).toBe(false);
    expect(admin.node('#api-connect-demo').textContent).toBe('reconnect Google');
    const reader = controls(false);
    reader.api.accountCount = 3;
    reader.api.connection = admin.api.connection;
    reader.render();
    expect(reader.node('#api-connect-demo').hidden).toBe(true);
  }
});

it('keeps sync control stable while exposing progress accessibly', () => {
  const view = controls(true);
  view.api.syncing = true;
  view.render();
  expect(view.node('#api-sync-production').setAttribute).toHaveBeenCalledWith('aria-busy', 'true');
});


it.each(['queued', 'running', 'recovering', 'retryable'])('keeps the Google connection usable while sync is %s', (status) => {
  const view = controls(true);
  view.api.connection = { status: 'syncing', resource: { id: 'channel', name: 'Channel' }, sync: { status, automaticRetry: true } };
  view.render();
  expect(view.node('#api-status-title').textContent).toContain('Connected');
  expect(view.node('#api-status-copy').textContent).not.toContain('Reconnect Google');
  expect(view.node('#api-sync-production').hidden).toBe(false);
  expect(view.node('#api-sync-production').disabled).toBe(true);
});
it('allows a retry after failure without requiring Google reconnection', () => {
  const view = controls(true);
  view.api.connection = { status: 'provider_error', resource: { id: 'channel' }, sync: { status: 'failed', automaticRetry: false } };
  view.render();
  expect(view.node('#api-status-title').textContent).toBe('Connected · update incomplete');
  expect(view.node('#api-sync-production').disabled).toBe(false);
});
it('summarizes all channel statuses instead of taking the first channel state', () => {
  const view = controls(true, true, true);
  view.api.connections = [
    { status: 'syncing', resource: { id: 'a' }, sync: { status: 'recovering' } },
    { status: 'connected', resource: { id: 'b' } },
    { status: 'connected', resource: { id: 'c' } },
  ];
  view.api.connection = view.api.connections[0];
  view.render();
  expect(view.node('#api-status-title').textContent).toBe('3/3 channels connected');
  expect(view.node('#api-status-copy').textContent).toContain('1 channel updating');
  expect(view.node('#api-status-copy').textContent).not.toContain('Reconnect');
});
it('requests authorization only for a real authorization state', () => {
  const view = controls(true);
  view.api.connection = { status: 'expired', resource: { id: 'a' } };view.render();
  expect(view.node('#api-status-title').textContent).toBe('Google authorization required');
  expect(view.node('#api-sync-production').hidden).toBe(true);
});
