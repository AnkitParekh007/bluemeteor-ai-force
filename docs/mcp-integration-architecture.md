# MCP integration architecture

## Overview

Bluemeteor AI Force exposes a **controlled MCP layer** on top of the existing tool pipeline:

`AgentOrchestrator` → `ToolExecutorService` → `ToolPermissionService` / approvals → `McpAdapterService` → (`McpConfigLoaderService`, `McpProcessManagerService`, `McpClientService`) → stdio MCP (or in-process **mockOnly** servers).

MCP is **optional** (`ENABLE_MCP_ADAPTER=false` by default). When disabled, agents keep working; MCP registry tools return a disabled summary without spawning processes.

## Configuration

- **File:** path from `MCP_CONFIG_PATH` (default `server/mcp.config.json`), resolved under the repository root (same safety model as other internal tools).
- **Example:** `server/mcp.config.example.json`
- **Per-server fields:** `id`, `name`, `enabled`, `transport`, `command`/`args` (stdio), `url` (http — not fully implemented), `workingDirectory`, `environment`, `allowedTools`, `deniedTools`, `readOnly`, optional **`mockOnly`** (no spawn; demo tools in-process).

## Supported transports

| Transport | Status |
|-------------|--------|
| `stdio` | Supported via `@modelcontextprotocol/sdk` (CJS require path). |
| `http` | Gated by `MCP_ALLOW_HTTP`; not implemented (clear error). |
| `sse` | Gated by `MCP_ALLOW_SSE` (default off); not implemented. |

## Server lifecycle

1. **Configured** — present in JSON; persisted in `mcp_servers` on init when MCP is enabled.
2. **Start** — `mcp_start_server` tool or `POST /mcp/servers/:id/start` (`tools.manage`). Validates command allowlist (`MCP_ALLOWED_COMMANDS`), cwd under repo + `MCP_WORKING_DIRECTORY`, transport flags.
3. **Running** — stdio child + MCP `Client` session held in `McpProcessManagerService`.
4. **Stop** — `mcp_stop_server` or `POST /mcp/servers/:id/stop`; processes closed on Nest shutdown.

Startup and tool calls use **timeouts** (`MCP_SERVER_STARTUP_TIMEOUT_MS`, `MCP_TOOL_CALL_TIMEOUT_MS`). Output is **capped** (`MCP_MAX_OUTPUT_CHARS`).

## Tool discovery & invocation

- **`mcp_discover_tools`** — connects (or uses mock), `listTools`, normalizes definitions, persists to `mcp_tools`, caches in memory.
- **`mcp_list_tools`** — reads cache or DB.
- **`mcp_call_tool`** — audited `mcp_tool_calls` row; invokes MCP `callTool`; write-like tool names are **blocked** unless `MCP_ALLOW_WRITE_TOOLS=true` (not recommended).

**Agent allowlist for `mcp_call_tool`:** `fronto`, `doco`, `producto` only, and only for servers `docs-filesystem` and `demo-docs` (extend in `mcp-adapter.service.ts` when adding connectors).

## Permissions & auditing

- Registry risk levels: list/discover = low; start/stop/call = medium (approval-gated like other medium tools when `ENABLE_TOOL_APPROVALS` is on).
- RBAC: `tools.execute.low` / `tools.execute.medium`, `tools.manage` for HTTP debug start/stop, `tools.execute.medium` for debug `POST /mcp/tools/call`.
- Prisma: `McpServer`, `McpTool`, `McpToolCall` tables for inventory and call audit.

## Read-only policy

- Config `readOnly: true` recommended for filesystem servers.
- `deniedTools` should list mutating tools (e.g. `write_file`, `delete_file`).
- Heuristic substring blocklist for names/descriptions when write tools are disallowed (`MCP_ALLOW_WRITE_TOOLS=false`).

## Debug UI & HTTP API

- Angular route: `/mcp-debug` (`tools.view`).
- REST: `GET /mcp/health`, `GET /mcp/servers`, `POST /mcp/servers/:id/start|stop|discover`, `GET /mcp/tools`, `POST /mcp/tools/call`.

## Demo / fallback

- **`mockOnly` servers** (e.g. `demo-docs`): no stdio; built-in `search_docs`, `read_doc`, `list_docs`.
- **`MCP_USE_MOCK_CLIENT_ON_FAILURE`**: in development, if a real server fails to start, a fallback `demo-docs` session may be created for recovery demos (real server still reports failed until fixed).

## Future roadmap

- HTTP/SSE MCP clients with URL allowlist and mTLS.
- Authenticated connectors (Jira, Confluence, Bitbucket read-only).
- Optional write tools behind stricter approvals and separate env flags.
