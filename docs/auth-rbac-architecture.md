# Auth & RBAC architecture — Bluemeteor AI Force

This document ties together the **Angular** client and **NestJS** server for JWT login, permission checks, agent-level access, audit logs, and rate limiting.

## Server

- **JWT**: `JwtAuthGuard` is registered globally; routes opt out with `@Public()` (login/refresh).
- **RBAC**: `PermissionsGuard` + `@RequirePermissions('permission.key')`. Set `ENABLE_RBAC=false` only for local debugging.
- **Tool policy**: `POST /tools/execute` does **not** use a coarse `RequirePermissions` on the route; `ToolPermissionService` evaluates the **authenticated user** (`actorUserId` from JWT), agent access row, tool risk tier, and mode (`ask` / `plan` / `act`).
- **Approvals**: `AgentApprovalService` records `requestedByUserId` and validates **resolve** with `tools.approve` / `system.admin` rules (including self-approval rules for high/critical risk).
- **Runs**: `AgentRun` stores optional `actorUserId` / `actorEmail` for traceability; orchestrator and `AgentAuditLogService` log the same where applicable.
- **Rate limiting**: `ThrottlerModule` with named limits (`default`, `agent`, `browser`, `login`). Disable via `ENABLE_RATE_LIMITING=false`. Env-driven caps: `RATE_LIMIT_*`, `AGENT_RATE_LIMIT_MAX_REQUESTS`, `BROWSER_RATE_LIMIT_MAX_REQUESTS` (see `server/README.md`).

## Angular

- **State**: `AuthStore` (session user, `hasPermission`, `canAccessAgent`, `canUseMode`, `loadCurrentUser`, `login`, `logout`). When `enableMockAgents` is true in `environment`, the UI treats the user as **fully entitled** for navigation (catalog-only mode; no API session).
- **HTTP**: `AuthTokenService` persists access/refresh in `sessionStorage`. `authInterceptor` attaches `Authorization: Bearer` to requests under `agentApiBaseUrl` and on **401** clears auth and routes to `/login`.
- **Guards**:
  - `authGuard` — loads current user, blocks unauthenticated access.
  - `loginRedirectGuard` — if already signed in, sends user to `/dashboard`.
  - `permissionGuard('a.b', 'c.d')` — all listed permissions required.
  - `agentSlugGuard` — on `agents/:slug`, requires `canAccessAgent(slug, 'view')`.
- **Pages**: Login uses `AuthStore.login`. Settings shows session and permissions. **Logs** calls `GET /audit/logs` (permission `audit.view`). **Admin → Users** calls `GET /auth/users` (`users.view`). Sidenav items are **hidden** when the user lacks the corresponding permission.

## Permission keys ( representative )

| Key | Used for |
|-----|-----------|
| `agents.view` | Agent catalog and workspace shell |
| `audit.view` | Audit log page |
| `users.view` | User directory (`/admin/users`) |
| `agents.runtime_debug.view` | Runtime debug page |
| `agents.readiness.view` | Readiness page |
| `tools.view` | Tool registry list/get |
| `tools.execute.*` | Risk-tier execution (enforced in `ToolPermissionService`) |
| `tools.approve` | Resolve approval requests |

The canonical list is in `server/src/auth/seed/permission-catalog.ts`.

## Operational notes

- **Secrets**: never commit `.env`. Production must set strong `JWT_*_SECRET` values; see `AppConfigService.validateAuthSecretsForProduction()`.
- **CORS**: align `CORS_ORIGIN` with the Angular dev/prod origin so browsers send cookies/headers as intended (Bearer is manual on XHR; no cookie session required).
