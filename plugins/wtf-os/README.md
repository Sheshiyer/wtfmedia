# WTF OS local Codex plugin

This package contains `wtf-os-local`, a stateless repository-local MCP server.
It exposes only deterministic, read-only release status, release history, and
client setup guidance.

It does **not** connect to Cloudflare, access D1/R2/Queues/KV, authorize a
provider account, expose provenance/media, modify a calendar, install itself,
or deploy/release software.

## Verify locally

From the repository root:

```bash
npm --prefix plugins/wtf-os test
```

The test launches the server over STDIO and performs the MCP initialization,
tool discovery, tool calls, resource discovery, and resource read. It does not
register the server globally or contact a network service.

## Copy-only client guidance

Review and copy one of these templates only if you choose to configure a local
client for this repository. Neither template is applied by the plugin or the
WTF OS user interface.

Codex project configuration (`.codex/config.toml`):

```toml
[mcp_servers.wtf_os_local]
command = "node"
args = ["plugins/wtf-os/scripts/wtf-os-mcp.mjs"]
cwd = "."
```

Cursor project configuration (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "wtf-os-local": {
      "command": "node",
      "args": ["plugins/wtf-os/scripts/wtf-os-mcp.mjs"],
      "cwd": "."
    }
  }
}
```

## Future hosted MCP

The future hosted shape is an owner-approved Cloudflare Worker endpoint using
Streamable HTTP at `https://<owner-approved-host>/mcp`. It remains unavailable
until Cloudflare Access/OAuth, redacted read-only DTOs, required bindings, and
deployment approval are verified. The Cloudflare account-management MCP is a
separate optional integration and must not be enabled by this plugin.

See `docs/handoffs/2026-08-29-agentic-integrations.md` and
`docs/wtf-os-agentic-settings.md` for the Settings, release history, and future
OTA contract.
