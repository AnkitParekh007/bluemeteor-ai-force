# Observability

Use the **Ops** dashboard (`/ops`, requires `system.debug.view`) for health, readiness, metrics, connector, MCP, and security snapshots.

## What Exists Today

- backend health and readiness endpoints
- metrics and runtime summaries
- security health snapshot
- connector and MCP visibility
- admin and pilot surfaces that can correlate readiness with adoption and feedback

## What Still Needs Work

- richer time-series visualization
- deeper trace and audit correlation in the UI
- clearer evaluation and regression dashboards
- production-grade alerting workflows beyond the current prototype views

During pilot, admins should correlate spikes in errors with audit logs and user feedback (`/pilot/metrics` and `/pilot/readiness`).
