import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(testDirectory, "..");

async function connectLocalServer(t) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["scripts/wtf-os-mcp.mjs"],
    cwd: pluginRoot,
    stderr: "pipe",
  });
  const client = new Client({ name: "wtf-os-mcp-test", version: "0.1.0" });
  await client.connect(transport);
  t.after(async () => {
    await client.close();
  });
  return client;
}

test("local MCP exposes only deterministic read-only tools", async (t) => {
  const client = await connectLocalServer(t);
  const result = await client.listTools();

  assert.deepEqual(
    result.tools.map((tool) => tool.name).sort(),
    ["wtf_os_release_history", "wtf_os_release_status", "wtf_os_setup_guidance"],
  );
  for (const tool of result.tools) {
    assert.equal(tool.annotations?.readOnlyHint, true);
    assert.equal(tool.annotations?.destructiveHint, false);
    assert.equal(tool.annotations?.openWorldHint, false);
  }

  const status = await client.callTool({
    name: "wtf_os_release_status",
    arguments: {},
  });
  assert.equal(status.isError, undefined);
  const release = JSON.parse(status.content[0].text);
  assert.equal(release.status, "local_scaffold");
  assert.equal(release.mcp.remote.enabled, false);
});

test("local MCP serves release resources and copy-only setup guidance", async (t) => {
  const client = await connectLocalServer(t);
  const resources = await client.listResources();
  assert.deepEqual(
    resources.resources.map((resource) => resource.uri).sort(),
    ["wtf-os://release/history", "wtf-os://release/status"],
  );

  const statusResource = await client.readResource({ uri: "wtf-os://release/status" });
  const release = JSON.parse(statusResource.contents[0].text);
  assert.equal(release.channel, "draft_held");

  const guidance = await client.callTool({
    name: "wtf_os_setup_guidance",
    arguments: {},
  });
  const setup = JSON.parse(guidance.content[0].text);
  assert.match(setup.clients.codex.configuration, /wtf_os_local/);
  assert.match(setup.clients.cursor.configuration, /wtf-os-local/);
  assert.equal(setup.clients.hosted.status, "not_configured");
});
