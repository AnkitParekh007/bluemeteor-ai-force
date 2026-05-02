# Internal tool hub architecture

## Scope

The **internal tool hub** centralizes **read-only** integrations: repository reader, docs reader, mock ticket reader, API catalog, database schema (markdown), CI/CD reader, and the **MCP adapter**.

## MCP vs built-in readers

| Layer | Built-in readers (`repository_*`, `docs_*`, …) | MCP (`mcp_*`) |
|-------|-----------------------------------------------|----------------|
| Data source | Files and JSON/Markdown under repo allowlists | External MCP servers (stdio today) |
| Config | `AppConfigService` + repo paths | `server/mcp.config.json` + env gates |
| Execution | Same process, `safe-file-reader` | Child process + MCP JSON-RPC |
| When to use | Stable, fast, fully controlled paths | Third-party tool ecosystems, docs MCP, future Jira/Confluence servers |

Agents should prefer **built-in readers** for repo and static docs; use **MCP** when the user asks for MCP-specific capabilities or when a configured MCP server adds tools not duplicated internally.

## Safety

All hub paths respect allowlists, blocked segments, and size caps. MCP adds command allowlists, transport flags, write-tool heuristics, and audited `mcp_tool_calls` rows.

See also: `docs/mcp-integration-architecture.md`.
