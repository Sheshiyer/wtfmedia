import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

function controls(manage: boolean, serverManage = manage) {
  const nodes = new Map<string, { hidden: boolean; disabled: boolean; textContent: string; classList: { toggle: ReturnType<typeof vi.fn> } }>();
  const node = (selector: string) => {
    if (!nodes.has(selector)) nodes.set(selector, { hidden: false, disabled: false, textContent: '', classList: { toggle: vi.fn() } });
    return nodes.get(selector)!;
  };
  const context = vm.createContext({ URLSearchParams, window: { location: { search: `?manage=${manage ? 1 : 0}` } },
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
