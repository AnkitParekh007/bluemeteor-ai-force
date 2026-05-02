# Runtime contracts (Bluemeteor AI Force)

This document aligns the **Angular** workspace with the **NestJS** agent API. Types are defined separately in `src/app/core/models/*` and `server/src/agents/models/*` — keep field names and event **type** strings in sync when changing either side.

## Base URL

- Config: `environment.agentApiBaseUrl` (e.g. `http://localhost:3000`).
- All HTTP calls go through `AgentApiService` (no hardcoded API roots in components).

## Core entities

| Concept | Backend model | Frontend model |
|--------|-----------------|----------------|
| Session | `AgentSession` | `AgentSession` |
| Message | `AgentMessage` | `AgentChatMessage` |
| Run | `AgentRun` (in `agent-run.model`) | `AgentRun` |
| Step | `AgentRunStep` | `AgentRunStep` |
| Tool call | `AgentToolCall` | `AgentToolCall` |
| Approval | `AgentApprovalRequest` | `AgentApprovalRequest` |
| Artifact | `AgentArtifact` | `AgentArtifact` |
| Runtime event | `AgentRuntimeEvent` | `AgentRuntimeEvent` |

**Dates:** ISO-8601 strings in JSON (e.g. `createdAt`, `timestamp`).

**Message roles:** `user` | `agent` | `system` (frontend also allows `tool` for future use).

## Runtime event `type` values

Emitted by `AgentEventBusService` / persisted in `AgentRuntimeEvent` rows. The UI **must not crash** on unknown types (handled via `default` in `handleRuntimeEvent`).

Known types (non-exhaustive as the platform evolves):

- Lifecycle: `session_created`, `run_started`, `run_completed`, `run_failed`
- Steps: `step_started`, `step_completed`, `step_failed`
- LLM stream: `token`, `message_created`
- Tools: `tool_call_started`, `tool_call_completed`, `tool_call_failed`, `tool_blocked`, `tool_execution_waiting_for_approval`
- Artifacts: `artifact_created`
- Approvals: `approval_required`, `approval_resolved`
- Browser: `browser_opened`, `browser_navigated`, `browser_screenshot_created`, `browser_dom_inspected`, `browser_action_completed`, `browser_action_failed`
- Tests: `test_run_started`, `test_run_completed`

**Payloads** are `Record<string, unknown>`; common keys include `token`, `url`, `error`, `approvalId`, `artifactId`.

## REST endpoints (agent API)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/agents/:agentSlug/sessions` | Create session |
| GET | `/agents/:agentSlug/sessions` | List sessions for agent |
| GET | `/agents/sessions/:sessionId` | Get session |
| GET | `/agents/sessions/:sessionId/messages` | List messages (hydration) |
| POST | `/agents/sessions/:sessionId/messages` | Send message (full response) |
| POST | `/agents/sessions/:sessionId/messages/stream-start` | Start streamed run |
| GET | `/agents/sessions/:sessionId/runs/:runId/events` | **SSE** runtime events |
| GET | `/agents/runs/:runId` | Run detail |
| POST | `/agents/sessions/:sessionId/runs/:runId/approvals/:approvalId` | Submit approval decision |
| GET | `/agents/sessions/:sessionId/artifacts` | List artifacts |
| GET | `/agents/sessions/:sessionId/activity` | List persisted events (session scope) |
| GET | `/agents/sessions/:sessionId/browser` | Browser workspace snapshot |

Tools catalog: `GET /tools`, `POST /tools/execute`, `GET /tools/runs/:runId/executions`.

## Frontend services

- **`AgentApiService`:** HTTP + SSE (`connectToRunEvents`). Mock mode uses `MockAgentBackendService`.
- **`AgentOrchestratorClientService`:** Orchestrates send/stream, applies events to `AgentSessionStore`, hydrates session on init/select.
- **`AgentSessionStore`:** Signals-based source of truth for the workspace UI.

## SSE behavior

- Events are JSON objects per SSE `message`, field `data`.
- Client closes the `EventSource` after `run_completed` or `run_failed`, or on unsubscribe.
- Server replays persisted events for the run, then forwards live events until a terminal event completes the observable.

## Known limitations

- Approving a tool mid-run **does not** automatically reopen SSE; activity can be refreshed via `GET .../activity` (done after approval submit in the client).
- Streaming path may finish before separate HTTP `message` row appears — UI relies on streamed tokens + `run_completed`.
- Mock agents bypass the Nest API; contracts apply when `enableMockAgents === false`.
