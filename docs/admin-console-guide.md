# Admin console guide

## Entry

Navigate to **`/admin`** (permission-gated). Typical permissions include `system.admin`, `users.view`, `agents.manage`, `tools.view`, `audit.view`, and related keys.

## Areas

- **Overview** — platform summary.
- **Agents / users / tools / connectors / MCP** — configuration and governance.
- **Evaluations / approvals / audit** — quality and compliance workflows.
- **Ops / readiness** — linked technical dashboards (`/ops`, `/agent-readiness`).

## Pilot

- **In-app hub:** **`/pilot`** — onboarding, guides, demos, feedback form, limitations, support.
- **Metrics & readiness (restricted):** `/pilot/metrics` (`system.debug.view` or `system.admin`), `/pilot/readiness` (adds `agents.readiness.view`).
- **Docs:** [`pilot-admin-guide.md`](pilot-admin-guide.md), [`internal-pilot-launch-plan.md`](internal-pilot-launch-plan.md).

Secrets and raw credentials are not shown in the admin UI; use your vault and env injection practices.
