# Security hardening (internal pilot)

This document summarizes controls added for a **controlled internal pilot**. It is not a full enterprise security certification.

## Authentication and RBAC

- JWT access and refresh secrets are validated on startup in **production** (length, distinct, non-placeholder).
- **Stream tokens** (`STREAM_TOKEN_SECRET`, `STREAM_TOKEN_TTL_SECONDS`) protect SSE: `POST …/stream-start` returns a `streamUrl` with `streamToken`; `GET …/events` is a **public** JWT route but requires a valid, run-scoped token and re-checks agent access for the user embedded in the token.
- **Strict agent access**: `agents.view` alone does **not** grant access to an agent. Users need an explicit `UserAgentAccess` row unless they have `system.admin` or `agents.manage`.
- **Session access**: `SessionAccessGuard` resolves `sessionId` / `runId` / `browserSessionId` / `testRunId` / `playwrightSpec` → `agentSlug` and enforces the same access levels on APIs that only expose those ids.

## Tools and approvals

- `ToolExecutorService` still evaluates `ToolPermissionService` on every execution; **`forceApproved` is only used on the approval-resume path** and does not skip RBAC.
- Direct **browser debug** HTTP actions are **off by default** (`ENABLE_DIRECT_BROWSER_DEBUG_ENDPOINTS=false`). When enabled, only `system.admin`, `system.debug.view`, or `tools.manage` may use them; mutations go through **`ToolExecutorService`** with `targetBrowserSessionId` so the normal risk and approval pipeline applies.

## Rate limiting

- Named throttlers include **`stream`** for SSE. Failed limits return **429** with `{ message, retryAfterSeconds }` via a global filter.

## Configuration flags (server)

| Variable | Purpose |
|----------|---------|
| `STREAM_TOKEN_SECRET` | Sign SSE stream tokens |
| `STREAM_TOKEN_TTL_SECONDS` | Stream token lifetime (default 300) |
| `ENABLE_DIRECT_BROWSER_DEBUG_ENDPOINTS` | Allow break-glass browser REST actions |
| `SEED_DEFAULT_ADMIN` | Allow default admin seed in production |
| `ALLOW_MOCK_FALLBACK_IN_PRODUCTION` | Permit connector mock fallback when `NODE_ENV` is production |

## Frontend

- **Auth interceptor**: on **401**, performs a **single shared refresh**, retries the request once (via `AUTH_REFRESH_RETRIED` context), then logs out if refresh fails. **403** does not trigger refresh.
- **`AuthStore.canAccessAgent`**: matches backend strict rules (no `agents.view` wildcard).
- **`/security-debug`**: requires `system.debug.view`; exercises `/auth/me` and `/security/health` without displaying tokens.

## Known remaining risks

- Screenshot and video artifacts may contain sensitive UI data; retention cleanup and redaction policies should be aligned with company policy.
- SQLite and local file storage are suitable for pilot only; plan PostgreSQL and hardened deployment for broader use.
