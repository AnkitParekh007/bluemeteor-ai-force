# Pilot admin guide

## How to check readiness

- **Pilot → Readiness** (requires `system.debug.view`, `agents.readiness.view`, or `system.admin`): gate summary and checks.
- **Agent readiness** page (`/agent-readiness`) and **Ops** (`/ops`) for deeper technical views.

## How to manage users

**Admin → Users**: assign roles and permissions so pilot users have `agents.view` and appropriate agent access levels (view / use / act).

## How to review audit logs

**Admin → Audit** (or **Logs** if exposed): filter by agent, actor, run ID. Do not export sensitive payloads to unsecured channels.

## How to review approvals

**Admin → Approvals** (or approvals tab in workspace tools): clear or reject pending items so pilot users are not blocked.

## How to monitor the ops dashboard

**Ops** (`/ops`): health, readiness JSON, metrics — use for daily checks during pilot.

## How to run evaluations

**Admin → Evaluations** / **Agent intelligence**: run or schedule evaluation cases; feed results back into readiness scores.

## How to generate a pilot report

As admin or debug user: **Pilot → Readiness → Generate pilot readiness report**, or `GET /pilot/report` — copy markdown for leadership.
