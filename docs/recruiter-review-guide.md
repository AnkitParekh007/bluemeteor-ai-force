# Recruiter Review Guide

## 30-Second Review Path

1. Read [README.md](../README.md).
2. Open [src/app/app.routes.ts](../src/app/app.routes.ts).
3. Scan [src/app/pages/agents/agent-workspace/agent-workspace.component.html](../src/app/pages/agents/agent-workspace/agent-workspace.component.html).

## 3-Minute Review Path

1. Read [docs/system-architecture.md](system-architecture.md).
2. Read [docs/security-model.md](security-model.md).
3. Open [src/app/core/data/mock-enterprise-demo-data.ts](../src/app/core/data/mock-enterprise-demo-data.ts).
4. Review [src/app/pages/admin/admin-overview/admin-overview.component.html](../src/app/pages/admin/admin-overview/admin-overview.component.html) and [src/app/pages/pilot/pilot-overview/pilot-overview.component.html](../src/app/pages/pilot/pilot-overview/pilot-overview.component.html).

## What A Reviewer Should Notice

- the project has both frontend and backend structure
- it treats approvals, governance, rollout, and observability as first-class concerns
- it is clear about prototype vs production boundaries
- it includes visible mock data to make the architecture understandable without fake adoption claims
