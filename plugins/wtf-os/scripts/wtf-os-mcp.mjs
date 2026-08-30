#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const releaseManifestUrl = new URL("../release.json", import.meta.url);

function unavailableRelease() {
  return {
    schemaVersion: 1,
    product: "WTF OS",
    version: "unknown",
    channel: "draft_held",
    releasedAt: null,
    status: "unavailable",
    mcp: {
      local: { enabled: false, mode: "read_only", transport: "stdio" },
      remote: { enabled: false, reason: "Local release manifest is unavailable." },
    },
    history: [],
  };
}

function loadRelease() {
  try {
    const parsed = JSON.parse(readFileSync(releaseManifestUrl, "utf8"));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.product !== "string" ||
      typeof parsed.version !== "string" ||
      !Array.isArray(parsed.history)
    ) {
      return unavailableRelease();
    }
    return parsed;
  } catch {
    return unavailableRelease();
  }
}

function textResult(value) {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  };
}

function setupGuidance() {
  return {
    scope: "repository_local_read_only",
    safeguards: [
      "This server has no network, provider, deployment, upload, calendar, or write tools.",
      "Copy a configuration only after reviewing it in the target client; this plugin never changes client settings.",
      "A hosted MCP endpoint remains unavailable until its owner-approved Cloudflare Access/OAuth policy and Worker deployment exist.",
    ],
    clients: {
      codex: {
        file: ".codex/config.toml",
        configuration: [
          "[mcp_servers.wtf_os_local]",
          'command = "node"',
          'args = ["plugins/wtf-os/scripts/wtf-os-mcp.mjs"]',
          'cwd = "."',
        ].join("\n"),
      },
      cursor: {
        file: ".cursor/mcp.json",
        configuration: JSON.stringify(
          {
            mcpServers: {
              "wtf-os-local": {
                command: "node",
                args: ["plugins/wtf-os/scripts/wtf-os-mcp.mjs"],
                cwd: ".",
              },
            },
          },
          null,
          2,
        ),
      },
      hosted: {
        configuration: {
          type: "http",
          url: "https://<owner-approved-host>/mcp",
        },
        status: "not_configured",
        note: "Use only after an owner-approved Cloudflare Worker deployment and Access/OAuth policy are verified.",
      },
    },
  };
}

const server = new McpServer({
  name: "wtf-os-local",
  version: "0.1.0",
  instructions:
    "WTF OS local is a stateless, read-only MCP. It cannot configure clients, access Cloudflare, connect provider accounts, read production data, or release software.",
});

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

server.registerTool(
  "wtf_os_release_status",
  {
    title: "WTF OS release status",
    description: "Read the repository-local WTF OS release manifest. This is not deployment status.",
    annotations: readOnlyAnnotations,
  },
  async () => textResult(loadRelease()),
);

server.registerTool(
  "wtf_os_release_history",
  {
    title: "WTF OS release history",
    description: "Read the immutable-style history recorded in the repository-local release manifest.",
    annotations: readOnlyAnnotations,
  },
  async () => {
    const release = loadRelease();
    return textResult({
      product: release.product,
      status: release.status,
      history: release.history,
    });
  },
);

server.registerTool(
  "wtf_os_setup_guidance",
  {
    title: "WTF OS client setup guidance",
    description: "Read copy-only local configuration guidance for Codex, Cursor, and a future hosted MCP.",
    annotations: readOnlyAnnotations,
  },
  async () => textResult(setupGuidance()),
);

server.registerResource(
  "wtf-os-release-status",
  "wtf-os://release/status",
  {
    title: "WTF OS release status",
    description: "Repository-local release manifest; no hosted release is implied.",
    mimeType: "application/json",
  },
  async () => ({
    contents: [
      {
        uri: "wtf-os://release/status",
        mimeType: "application/json",
        text: JSON.stringify(loadRelease(), null, 2),
      },
    ],
  }),
);

server.registerResource(
  "wtf-os-release-history",
  "wtf-os://release/history",
  {
    title: "WTF OS release history",
    description: "Repository-local release history; entries do not certify publication.",
    mimeType: "application/json",
  },
  async () => {
    const release = loadRelease();
    return {
      contents: [
        {
          uri: "wtf-os://release/history",
          mimeType: "application/json",
          text: JSON.stringify({ history: release.history }, null, 2),
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
server.connect(transport).catch(() => {
  process.exitCode = 1;
});
