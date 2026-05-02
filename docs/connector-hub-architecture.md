# Connector hub architecture

## Overview

The **connector hub** is a server-side, **read-only** integration layer between the agent workspace and company systems: Bitbucket, GitHub (optional), Jira, Confluence, support tools (Zendesk / ServiceNow / mock), and CI/CD file analysis (local repository reader, with optional future remote file reads).

- **Credentials live only on the NestJS server** (`AppConfigService` / environment variables). They are never returned to Angular.
- **Tool execution** flows through `ToolExecutorService` → `ConnectorHubService` → per-connector services → `ConnectorOutputNormalizerService` (same normalized shape as internal read tools).
- **Audit trail**: successful connector invocations persist a `ConnectorCall` row (summary + status; no tokens).

## Components

| Piece | Role |
|--------|------|
| `ConnectorsModule` | Wires HTTP client, connectors, registry, health, hub, REST controller |
| `ConnectorHttpService` | Timeouts, capped bodies, redacted logs, optional single retry on GET 429/5xx |
| `BitbucketConnectorService` / `GithubConnectorService` | Repository listing, file read, code search, PRs, commits |
| `JiraConnectorService` | Search + issue read (JQL or text) |
| `ConfluenceConnectorService` | Space list, CQL search, page read (HTML stripped) |
| `SupportTicketConnectorService` | Zendesk / ServiceNow when configured; otherwise mock or internal `TicketReaderService` |
| `CicdConnectorService` | Delegates to `CicdReaderService` for local pipeline files + analysis |
| `ConnectorRegistryService` | Static capability map + config-derived definitions |
| `ConnectorHealthService` | Per-connector health probes |
| `ConnectorHubService` | Single entry for all `connector_*` tools |
| `ConnectorsController` | Debug/admin GET routes under `/connectors` (JWT + `tools.view`) |

## Mock fallback

When `ENABLE_CONNECTOR_MOCK_FALLBACK=true` and external credentials are missing, connectors return **deterministic mock data** (supplier portal repos, Jira-style issues, Confluence-style pages, support tickets, CI/CD analysis). Agents remain useful in local dev without secrets.

## Safety model

- **No write verbs**: no PR creation, no pushes, no Jira/Confluence/support mutations, no pipeline runs.
- **Path guard**: `.env`, private keys, and common secret paths are blocked for repository file reads.
- **Allowlists**: Bitbucket `BITBUCKET_ALLOWED_REPOS` / default repo; GitHub `GITHUB_ALLOWED_REPOS` + `GITHUB_DEFAULT_OWNER`; Jira `JIRA_PROJECT_KEYS`; Confluence `CONFLUENCE_SPACE_KEYS`.
- **Output caps**: `CONNECTOR_MAX_CONTENT_CHARS` and `CONNECTOR_MAX_RESULTS`.

## Agent integration

- **Tool catalog**: `connector_*` tools registered in `connector-tools-catalog.ts`.
- **Executor**: `connector_*` routes to `runConnector` (emits `connector_call_*` runtime events, writes `ConnectorCall`).
- **Planning**: `AgentOrchestratorService.planToolsForMessage` prefers connector tools when the user mentions repos, Jira, Confluence, support, pipelines, PRs, or commits; **at most three** connector tools per planned batch.
- **Provider context**: `AgentContextBuilderService` prefixes connector summaries for the LLM.

## Future write roadmap

Write actions (Jira transitions, Confluence edits, PR creation) would require:

1. Explicit tool definitions marked **high/critical** risk  
2. **Approval gates** + durable audit  
3. Scoped OAuth / app tokens per tenant  
4. Strict allowlists and idempotency keys  

Until then, the hub stays **read-only-first**.
