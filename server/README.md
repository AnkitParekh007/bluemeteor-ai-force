# Bluemeteor AI Force — Agent orchestrator (NestJS)

NestJS backend for the Angular agent workspace: **Prisma** persistence (**SQLite** for local dev, **PostgreSQL** for pilot/Docker), multi-provider LLM routing (mock / OpenAI / Anthropic / local Ollama), **SSE** runtime streaming, RAG foundation, and browser/test workers.

## Install

```bash
cd server
npm install
```

## Database (Prisma)

### SQLite (local)

1. Copy `.env.example` to `.env` — default `DATABASE_PROVIDER=sqlite`, `DATABASE_URL="file:./dev.db"`.
2. `npx prisma generate && npx prisma db push` to sync the schema.

Useful: `npm run prisma:studio`, `npm run prisma:generate`, `npm run db:health`, `npm run db:seed` (after `npm run build`).

### PostgreSQL (Docker / pilot)

- Source schema: `prisma/schema.prisma` (SQLite). Synced Postgres schema: `node scripts/sync-postgres-schema.mjs` → `prisma/postgres/schema.prisma`.
- Migrations: `prisma/postgres/migrations` — `npm run prisma:migrate:deploy`
- Docker entrypoint runs `prisma migrate deploy` when `DATABASE_URL` is postgres.

See `docs/database-operations.md` and `docs/deployment-guide.md`.

## Agent intelligence API

REST surface under `/agent-intelligence` (JWT + RBAC):

| Area | Examples |
|------|-----------|
| Prompts | `GET/POST /agent-intelligence/prompts`, `POST …/prompts/render`, `POST …/:id/activate` |
| Skill packs | `GET/POST /agent-intelligence/skill-packs`, `POST …/:id/activate` |
| Workflows | `GET/POST /agent-intelligence/workflows`, `POST …/match` |
| Evaluations | `GET …/evaluations/cases`, `POST …/evaluations/run`, `GET …/evaluations/readiness/:agentSlug` |

- **Read** endpoints: `agents.readiness.view`
- **Write** endpoints: `agents.manage`

On first boot with an empty `agent_prompt_templates` table, `AgentIntelligenceSeedService` seeds prompts, workflows, skill packs, and golden evaluation cases for the eight priority agents (disable with `AGENT_INTEL_SEED=0`).

**Evaluations** call the real orchestrator in `plan` mode with `context.evaluation` and skip blocklisted browser/Playwright/MCP/deploy/database tools unless options explicitly allow them.

## Run

```bash
npm run start:dev
```

Default URL: `http://localhost:3000` (`PORT` in `.env`).

**Do not commit `.env` or API keys.**

## Environment variables

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP port (default `3000`) |
| `NODE_ENV` | `development` \| `production` |
| `DATABASE_PROVIDER` | `sqlite` (default) or `postgresql` |
| `DATABASE_URL` | SQLite `file:./dev.db` or Postgres URL |
| `STORAGE_ROOT` | Root for generated assets (default `storage`; `/data/storage` in Docker) |
| `API_GLOBAL_PREFIX` | Optional Nest global prefix (`health` / `live` / `ready` stay at root) |
| `ENABLE_METRICS` | `GET /metrics` (default on; set `false` to 404) |
| `METRICS_PUBLIC` | `true` allows `/metrics` without JWT (default `false`) |
| `STRUCTURED_LOGGING` | JSON request logs when `true` or in production |
| `AGENT_PROVIDER` | `mock` (default), `openai`, `anthropic`, `local` |
| `AGENT_STREAMING_ENABLED` | `true` (default) — surfaced on health endpoints |
| `ALLOW_PROVIDER_FALLBACK` / `AGENT_ALLOW_PROVIDER_FALLBACK` | In **development**, fall back to mock if the selected provider is misconfigured |
| `AGENT_MAX_MESSAGE_CHARS` | Max inbound user message length (default `12000`) |
| `ENABLE_DEBUG_RUNTIME_LOGS` | Extra orchestrator/RAG logging |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | OpenAI (`gpt-4o-mini` default) |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Anthropic (`claude-3-5-sonnet-latest` default) |
| `LOCAL_MODEL_BASE_URL` / `LOCAL_MODEL_NAME` | Ollama-compatible `POST /api/chat` |
| `CORS_ORIGIN` | Allowed Angular origin(s), comma-separated |
| `ENABLE_APPROVAL_GATES` | Keyword + config-based approvals |
| `ENABLE_AUDIT_LOGS` | Persist audit rows when enabled |
| `ENABLE_BROWSER_WORKER` | Reserved for real Playwright |
| `ENABLE_TEST_WORKER` | Reserved for real test runner |
| `ENABLE_RBAC` | Permission checks on guarded routes (default on; set `false` to disable for local emergencies only) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | HS256 secrets for access / refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Token lifetimes (defaults `15m` / `7d`) |
| `ENABLE_RATE_LIMITING` | Global + named throttlers (`false` disables `@nestjs/throttler` guard) |
| `RATE_LIMIT_TTL_SECONDS` | Window for **default** HTTP bucket (default `60`) |
| `RATE_LIMIT_MAX_REQUESTS` | Max hits per IP per window — **default** named throttler |
| `AGENT_RATE_LIMIT_MAX_REQUESTS` | Cap for **agent** named throttler (messages / tools.execute, etc.) |
| `BROWSER_RATE_LIMIT_MAX_REQUESTS` | Cap for **browser** named throttler |
| `AUTH_DEMO_USERS_ENABLED` | Seed demo users when DB migrations include auth seed (default on in dev) |

### Internal read-only tools

Copy variables from `.env.example` under **Internal read-only tool hub**. Key settings:

| Variable | Purpose |
|----------|---------|
| `ENABLE_INTERNAL_TOOLS` | Master switch (default on) |
| `REPOSITORY_ROOT` | Absolute base resolved from server CWD (default `../` monorepo root) |
| `REPOSITORY_ALLOWED_PATHS` | Comma-separated relative prefixes (e.g. `src,server,docs`) |
| `MAX_TOOL_FILE_READ_BYTES` | Hard cap per file read (default `200000`) |
| `API_CATALOG_PATH` / `DATABASE_SCHEMA_PATH` | Paths under repo root for JSON/Markdown docs |
| `ENABLE_MCP_ADAPTER` | Live MCP execution (default `false`; config can still be listed) |

**Debug HTTP API** (JWT + `tools.view`): `GET /internal-tools/health`, `GET /internal-tools/repository/search?q=`, etc. Normal agent runs use `ToolExecutorService`, not these routes.

**Safety:** tools never read `.env`, private keys, `node_modules`, `dist`, or `.git`. Paths outside allowlists are rejected in `safe-file-reader.ts`.

### MCP

See `docs/mcp-integration-architecture.md`. Configure `server/mcp.config.json` (copy from `mcp.config.example.json`). Key env vars:

| Variable | Purpose |
|----------|---------|
| `MCP_CONFIG_PATH` | Relative to repo root (default `server/mcp.config.json`) |
| `MCP_SERVER_STARTUP_TIMEOUT_MS` / `MCP_TOOL_CALL_TIMEOUT_MS` | Timeouts |
| `MCP_MAX_OUTPUT_CHARS` | Truncate tool output |
| `MCP_ALLOW_STDIO` / `MCP_ALLOW_HTTP` / `MCP_ALLOW_SSE` | Transport gates (HTTP/SSE not implemented yet) |
| `MCP_ALLOW_WRITE_TOOLS` | Must stay `false` unless you accept mutating MCP tools |
| `MCP_ALLOWED_COMMANDS` | Spawn allowlist (`npx,node,bun,python`) |
| `MCP_WORKING_DIRECTORY` | Base cwd for MCP servers (relative to repo root) |
| `MCP_DEBUG_LOGS` | Extra logging (no secrets) |
| `MCP_USE_MOCK_CLIENT_ON_FAILURE` | Dev-only: ensure `demo-docs` mock session after failed stdio start |

**Debug routes** (JWT): `GET /mcp/health`, `GET /mcp/servers`, `POST /mcp/servers/:id/start` (needs `tools.manage`), `POST /mcp/tools/call` (needs `tools.execute.medium`). Angular: `/mcp-debug`.

### Connector hub (read-only)

See `docs/connector-hub-architecture.md`. All secrets stay in **server** env vars; Angular only calls debug listing/health endpoints with JWT.

| Variable | Purpose |
|----------|---------|
| `ENABLE_CONNECTORS` | Master switch (default on) |
| `ENABLE_CONNECTOR_MOCK_FALLBACK` | Return mock repo/ticket/docs data when creds missing |
| `CONNECTOR_HTTP_TIMEOUT_MS` / `CONNECTOR_MAX_RESULTS` / `CONNECTOR_MAX_CONTENT_CHARS` | Safety caps |
| **Bitbucket** | `ENABLE_BITBUCKET_CONNECTOR`, `BITBUCKET_WORKSPACE`, `BITBUCKET_USERNAME`, `BITBUCKET_APP_PASSWORD`, `BITBUCKET_ALLOWED_REPOS`, `BITBUCKET_DEFAULT_REPO` |
| **GitHub** | `ENABLE_GITHUB_CONNECTOR`, `GITHUB_TOKEN`, `GITHUB_DEFAULT_OWNER`, `GITHUB_ALLOWED_REPOS` |
| **Jira** | `ENABLE_JIRA_CONNECTOR`, `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEYS` |
| **Confluence** | `ENABLE_CONFLUENCE_CONNECTOR`, `CONFLUENCE_BASE_URL`, `CONFLUENCE_EMAIL`, `CONFLUENCE_API_TOKEN`, `CONFLUENCE_SPACE_KEYS` |
| **Support** | `ENABLE_SUPPORT_CONNECTOR`, `SUPPORT_CONNECTOR_PROVIDER` (`mock` \| `zendesk` \| `servicenow`), plus Zendesk or ServiceNow URL + credentials |
| **CI/CD** | `ENABLE_CICD_CONNECTOR`, `CICD_PROVIDER` — uses local `CicdReaderService` |

**Enable Bitbucket:** set `ENABLE_BITBUCKET_CONNECTOR=true`, fill workspace + username + app password, set `BITBUCKET_ALLOWED_REPOS` to comma-separated slugs (or `BITBUCKET_DEFAULT_REPO`).

**Enable Jira Cloud:** set `ENABLE_JIRA_CONNECTOR=true`, `JIRA_BASE_URL=https://your-domain.atlassian.net`, email + API token, optional `JIRA_PROJECT_KEYS=PROJ,OTHER`.

**Enable Confluence Cloud:** set `ENABLE_CONFLUENCE_CONNECTOR=true`, base URL `https://your-domain.atlassian.net`, email + API token, `CONFLUENCE_SPACE_KEYS`.

**Test health:** `GET /connectors/health` (JWT + `tools.view`) or Angular `/connectors-debug`.

**Troubleshooting:** `401`/`403` on connectors → wrong token or missing API scope; empty repo list → allowlist too strict; always verify `ENABLE_CONNECTORS` is true.

**Security:** never commit tokens; rotate app passwords; restrict `*_ALLOWED_*` lists in production.

Named throttlers (`default`, `agent`, `browser`, `login`) apply `@Throttle({ … })` on hot routes (login/refresh, agent messages/stream-start, tool execute, browser actions). Defaults come from `AppConfigService` and env overrides above.

### Browser profiles & Playwright smoke tests

See repo root `docs/authenticated-browser-sessions.md` and `docs/playwright-test-runner.md`.

| Area | Notes |
|------|--------|
| **Playwright install** | In `server/`: `npm run playwright:install` (Chromium for the worker). |
| **Auth profiles** | `ENABLE_AUTHENTICATED_BROWSER_SESSIONS`, `BROWSER_AUTH_STATE_DIR`, `TEST_TARGET_*`, capture REST under `/browser/auth-captures/*`. |
| **Test target** | `TEST_TARGET_BASE_URL`, `TEST_TARGET_LOGIN_URL`, `TEST_TARGET_ALLOWED_ORIGINS`, `TEST_TARGET_ENVIRONMENT`, `ALLOW_TESTS_AGAINST_PRODUCTION`. |
| **Real template runs** | `ENABLE_REAL_PLAYWRIGHT_TESTS=true` plus `ENABLE_BROWSER_WORKER=true`. |
| **Static assets** | Safe URLs only: `/test-assets/screenshots`, `/videos`, `/traces`, `/reports` (not auth state). |
| **Troubleshooting** | Runs **blocked** with a clear message when real tests are off; check allowlist and `npx prisma db push` for new tables. |

**Debug UI:** Angular route `/browser-test-debug` (JWT + `tools.view`).

## Authentication & RBAC

All non-`@Public()` HTTP routes require a **Bearer** access token. Permissions are stored in the database and checked by `PermissionsGuard` when controller methods use `@RequirePermissions('key')`. Tool execution also enforces `ToolPermissionService` (agent access row, risk tier, mode).

| Area | Endpoints (summary) |
|------|----------------------|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `GET /auth/permissions` |
| User admin | `GET|POST|PATCH /auth/users…` (admin permissions) |
| Audit | `GET /audit/logs?limit=` — requires `audit.view` |

See `docs/auth-rbac-architecture.md` in the repo root for the full flow (Angular `AuthStore`, guards, server alignment).

## HTTP API (no global `/api` prefix)

### Health

- `GET /health` — service status, provider name, provider health hints, DB flag, RAG doc count, streaming flag
- `GET /agents/runtime/health` — orchestrator snapshot: counts (sessions, runs, artifacts, events), RAG doc count, active provider, streaming / approval flags

### Agents

- `GET /agents/configs` — internal agent registry
- `POST /agents/:agentSlug/sessions` — create session
- `GET /agents/:agentSlug/sessions` — list sessions
- `GET /agents/sessions/:sessionId` — session detail
- `GET /agents/sessions/:sessionId/messages` — messages
- `POST /agents/sessions/:sessionId/messages` — **non-streaming** run (orchestrated turn)
- `POST /agents/sessions/:sessionId/messages/stream-start` — start SSE run; body same as non-streaming; response `{ runId, streamUrl, userMessageId }`
- `GET /agents/sessions/:sessionId/runs/:runId/events` — **SSE** (EventSource); replays persisted events then live events until `run_completed` / `run_failed`
- `GET /agents/sessions/:sessionId/artifacts` — artifacts
- `GET /agents/sessions/:sessionId/activity` — runtime event log (session)
- `GET /agents/runs/:runId` — run detail
- `POST /agents/sessions/:sessionId/runs/:runId/approvals/:approvalId` — resolve approval

### RAG (foundation)

- `POST /rag/documents` — ingest body text, chunk, store
- `GET /rag/documents` | `GET /rag/documents/:id` — list / get
- `POST /rag/search` — keyword-style search (embeddings later)
- `POST /rag/seed-demo` — **development only**: seed internal demo documents

## Streaming flow (Angular + EventSource)

1. Client `POST .../messages/stream-start` with `agentSlug`, `mode`, `message`.
2. Server creates the user message and run, returns `runId` and relative `streamUrl`.
3. Client opens **GET** `streamUrl` with `EventSource` (only GET is allowed in browsers).
4. Server replays stored events for the run, then streams new events from the orchestrator.

Non-streaming `POST .../messages` remains unchanged.

## Mock provider fallback

- With `AGENT_PROVIDER=mock` (default), no outbound LLM calls; deterministic mock content.
- In development, if `openai` / `anthropic` is selected but the API key is missing, the provider router can fall back to mock when `ALLOW_PROVIDER_FALLBACK=true`.
- In production, configure keys explicitly or set `ALLOW_PROVIDER_FALLBACK=true` only if you intend silent fallback (discouraged).

## Angular connection

1. Run this server on port `3000` (or your `PORT`).
2. In `src/environments/environment.ts`, set `enableMockAgents: false` and `agentApiBaseUrl` to this server’s origin.
3. Toggle `enableAgentStreaming` for SSE chat vs non-streaming POST.
4. If the server is offline, set `enableMockAgents: true` to use the in-browser mock backend.

## Demo checklist

See project root `docs/agent-runtime-architecture.md` (authenticated browser + Playwright flows).

## Future work

- PostgreSQL in production, migrations pipeline
- Multi-tenant org boundaries (beyond current user + role model)
- Vector embeddings and hybrid RAG retrieval
