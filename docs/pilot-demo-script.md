# Pilot demo script (30 minutes)

## Agenda (30 min)

| Time | Topic |
|------|--------|
| 0–5 | Objective, safety rules, support path |
| 5–12 | Demo 1 — Fronto (UI/component) |
| 12–18 | Demo 2 — Testo (tests) — shortened if browser not configured |
| 18–24 | Demo 3 — Producto (stories/AC) |
| 24–28 | Feedback + metrics (admin view) |
| 28–30 | Q&A, next steps |

## Six scenarios

Align with **Pilot → Demo scripts** in the app. Expected outcomes:

1. **Fronto** — Angular-focused answer + checklist or code-oriented artifact.
2. **Testo** — test plan + optional Playwright artifact; no production URL.
3. **Producto** — user stories + acceptance criteria + risks.
4. **Dato** — SQL text + explanation; no execution.
5. **DevOpsy** — release checklist + risks; no deployment.
6. **Supporto** — reply draft + escalation notes; not sent.

## Screenshots / outcomes

Capture: workspace with trace chip, artifacts panel with generated file, feedback success toast (optional), readiness gate state (admin).

## Troubleshooting

- **401 / forbidden**: confirm RBAC and agent access.
- **Empty provider response**: check server env and provider configuration.
- **Browser blocked**: verify allowed origins and non-prod policy.
