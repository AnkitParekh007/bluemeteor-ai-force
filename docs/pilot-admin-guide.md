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

---

## Feedback triage workflow

1. Open **Pilot → Improvements** (`/pilot/improvements`)
2. Click **Run triage** — classifies all new feedback automatically
3. Review the **Feedback queue** tab
4. For high/critical severity items, review the root cause and recommended action
5. Use the **+ Eval case** button to create evaluation cases from critical feedback
6. Update triage status as you work through items (triaged → planned → resolved)

## Improvement backlog workflow

1. Click **Generate recommendations** — creates backlog items from triaged feedback
2. Open the **Improvement backlog** tab
3. Review each recommendation:
   - **Accept** items you plan to implement
   - **Reject** items that are not actionable or won't fix
4. For accepted items, apply the suggested change manually in:
   - `/admin/prompts` for prompt changes
   - `/admin/workflows` for workflow changes
   - `/admin/evaluations` for new evaluation cases
5. After applying, click **Mark implemented**
6. Run an evaluation for the agent (`/admin/evaluations`)
7. Return to **Agent regression** tab to check the score delta
8. If score improved and issue is resolved, click **Mark validated**

## Regression analysis workflow

1. Open **Pilot → Improvements → Agent regression**
2. Select an agent
3. Review:
   - Latest score vs previous score
   - Score delta (green = improved, red = regressed)
   - Number of regressed vs improved cases
   - Recommendation text
4. If regressed, create new backlog items and investigate recent changes
5. If improved and validated, close related backlog items
