# Enterprise runtime audit — Bluemeteor AI Force

**Scope:** Stabilization pass (no MCP); auth/RBAC layered in a follow-up phase.  
**Date:** 2026-05-02  

## 1. Architecture summary

- **Angular 21** standalone app: chat thread, composer, session sidebar, right tool window (browser / artifacts / console / tests / activity / approvals).
- **NestJS** backend: orchestrator → provider router → tools / browser worker / artifacts / approvals; **Prisma + SQLite** persistence; **SSE** for run events.
- **State:** `AgentSessionStore` is the UI source of truth; `AgentApiService` is the only module that should know API URLs for agent features.

## 2. What is working

- Non-streaming `POST .../messages` path with full `AgentSendResponse` application to the store.
- Tool execution, permissions, and approval creation on the server; `resumeByApproval` after HTTP approval.
- Browser worker URL policy (`http`/`https` + allowlist; blocks `file:`, `javascript:`, `data:`, `chrome:`, etc.).
- Mock agent mode for offline UI (`enableMockAgents`).
- Agent not-found affordance in `agent-workspace` when slug is invalid.
- Prisma repositories for sessions, messages, runs, events, artifacts, tool executions, browser entities.

## 3. What was fixed (this audit)

| Area | Fix |
|------|-----|
| **SSE / memory** | `AgentEventBusService.emit` completes and removes live `Subject` per run on terminal events to avoid leaking subjects. |
| **SSE client** | `connectToRunEvents` avoids treating intentional close as hard failure when possible; teardown sets terminal flag. |
| **Event types** | Frontend `AgentRuntimeEventType` aligned with backend (tool/browser/approval extras). |
| **Runtime handling** | `handleRuntimeEvent` covers browser screenshot/DOM/tool/approval resolved; `approval_required` clears “thinking”; `run_completed` clears thinking; tool completion refreshes artifacts. |
| **Approval UX** | `submitApproval` waits for API success before mutating store; refreshes run + activity; surfaces errors to composer/console (removed incorrect optimistic `run.completed`). |
| **Hydration** | Live API: after `listSessions`, loads **messages**, **artifacts**, and **activity** for the active session; **session switch** reloads the same. Added `GET .../messages` client (`listSessionMessages`). |
| **Contracts doc** | `docs/runtime-contracts.md` added. |

## 4. Remaining known issues / gaps

| Issue | Severity |
|-------|-----------|
| Resume after approval does not stream new tool events to an already-closed SSE connection (events are persisted; refresh activity or reconnect pattern not Productized). | Medium |
| No automated E2E tests for demos; manual validation recommended per release. | Medium |
| `npm test` / server unit tests not wired for Nest (no Jest in server package). | Low |
| Streaming vs non-streaming duplicate user message if client retries stream-start — not guarded server-side. | Low |

## 5. Security notes (baseline)

- No shell execution in browser worker; no arbitrary `page.evaluate` with user-controlled strings (fixed summaries only).
- Secrets must not appear in logs (audit uses structured actions; avoid logging cookies/screenshot paths to clients except public `/browser/screenshots/...` URLs).
- Deploy / DB execution tools blocked or disabled at registry/config level.

### 5.1 Auth / RBAC (2026 follow-up)

- **JWT** guards non-public HTTP APIs; refresh token rotation on `/auth/refresh`.
- **Permissions** on controllers (`RequirePermissions`) plus **tool-level** checks in `ToolPermissionService` for `/tools/execute`.
- **Angular**: `AuthStore`, Bearer interceptor, route guards (`authGuard`, `permissionGuard`, `agentSlugGuard`), `/admin/users`, `/logs` wired to server.
- **Audit**: `GET /audit/logs` gated by `audit.view`; UI hides Logs nav item without permission.
- **Rate limiting**: `@nestjs/throttler` with env-driven caps; disable with `ENABLE_RATE_LIMITING=false` if needed locally.

Details: `docs/auth-rbac-architecture.md`, `server/README.md`.

## 6. Production blockers (before external rollout)

- PostgreSQL + backups / migrations strategy (currently SQLite).
- Harden JWT secrets, CORS, and rate-limit thresholds per environment (controls exist; operators must set prod values).

## 7. Readiness scores (0–10)

| Dimension | Score | Notes |
|-----------|------:|-------|
| Frontend workspace UX | **8** | Polished layout; depends on backend for live data. |
| Session/runtime architecture | **7** | Store-centric; hydration improved for refresh. |
| Backend orchestrator | **8** | Tool phase + provider integration present. |
| Streaming reliability | **7** | SSE replay + live; terminal cleanup improved. |
| Persistence | **8** | Prisma models cover core entities; migrations operator-owned. |
| Provider abstraction | **8** | Router + mock fallback documented in code. |
| RAG foundation | **6** | Present; quality depends on corpus. |
| Browser worker | **7** | Allowlist + action caps; Playwright install separate step. |
| Tool execution | **8** | Repository + executor + permissions. |
| Approval gates | **7** | Server + UI; post-approval UX partially async. |
| Security baseline | **7.5** | JWT + RBAC + tool policy; still no org/tenant isolation. |
| Demo readiness | **8** | Demos assume env flags documented in server README. |
| Production readiness | **5** | Auth path in place; Postgres, SRE, and tenant boundaries still future. |

## 8. Priority follow-ups

**Critical (internal rollout)**  
- [ ] Run `npx prisma migrate dev` in environments that need schema updates.  
- [ ] `npm run playwright:install` in `server/` where real browser is enabled.  

**High**  
- [ ] Optional: reconnect or poll activity after approval when run was waiting on tools.  
- [ ] Monitor SSE error rates in browser DevTools during long runs.  

**Medium**  
- [ ] Add Nest + Jest or Vitest for `ToolPermissionService` and URL helpers.  

**Next phase candidates** (pick one): MCP tools · authenticated browser hardening · PostgreSQL migration · org/tenant model.

## 9. Minimal tests

No new automated test suite added: server `package.json` has no `test` script. Recommended: add `@nestjs/testing` + Jest or use root **Vitest** with path alias to `server/src`. Manual demo checklist: use scenarios in section 10 of the stabilization request.

---

*This audit is a snapshot; re-run after major orchestrator or schema changes.*
