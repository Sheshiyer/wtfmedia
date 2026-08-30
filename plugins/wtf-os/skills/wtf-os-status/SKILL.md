---
name: wtf-os-status
description: Use the repository-local WTF OS MCP to inspect truthful release status, history, and setup guidance.
---

# WTF OS status

Use `wtf_os_release_status`, `wtf_os_release_history`, and
`wtf_os_setup_guidance` only for their documented read-only outputs.

- Treat `local_scaffold`, `draft_held`, `not_configured`, and `unavailable` as
  unavailable states, not as successful hosted connections or releases.
- Do not infer Cloudflare bindings, OAuth connections, calendar access,
  deployment authority, or OTA eligibility from this plugin.
- Present setup snippets as copy-only guidance. A user must explicitly decide
  whether to apply them in their own client configuration.
