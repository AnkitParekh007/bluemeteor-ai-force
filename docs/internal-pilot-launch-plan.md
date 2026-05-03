# Internal pilot launch plan — Bluemeteor AI Force

## 1. Pilot objective

Validate governed agent usage with real internal workflows, collect structured feedback, and confirm readiness signals before expanding beyond the pilot cohort.

## 2. Pilot scope

- In scope: priority agents (Fronto, Backo, Testo, Producto, Doco, Dato, Supporto, DevOpsy), workspace features already shipped, pilot UI at `/pilot`, feedback API, readiness gate, admin/ops visibility.
- Out of scope: new product features, marketplace/SaaS, billing, multi-tenancy, unapproved write connectors.

## 3. Included agents

Fronto, Backo, Testo, Producto, Doco, Dato, Supporto, DevOpsy — see `docs/pilot-sample-prompts.md` and in-app **Pilot → Agent guides**.

## 4. Included users / roles

Engineering, QA, PM, documentation, data, support, DevOps, team leads, and designated admins. RBAC and per-agent access still apply.

## 5. Setup checklist

- [ ] Auth and RBAC verified for pilot users.
- [ ] `pilot_feedback` table applied (`prisma migrate` / `db push` per environment).
- [ ] Provider keys and non-production targets configured for browser/tests where used.
- [ ] Admin contact and escalation channel published (Pilot → Support).

## 6. Admin checklist

- [ ] `/pilot/readiness` gate green or documented warnings.
- [ ] `/admin` users and agent access reviewed.
- [ ] Pending approvals queue reviewed daily.
- [ ] `GET /pilot/report` sample run for leadership readout.

## 7. User onboarding steps

1. Log in → **Pilot → Onboarding**.
2. Open recommended agent → start session → run one sample prompt.
3. Review artifacts → **Pilot → Feedback** (or **Feedback** in workspace header).

## 8. Demo plan

Use **Pilot → Demo scripts** and `docs/pilot-demo-script.md` (30-minute agenda, six scenarios).

## 9. Daily monitoring checklist

- Readiness / health unchanged from baseline.
- Spike in failed runs or SSE errors investigated.
- New feedback scanned for safety or access themes.

## 10. Feedback review process

Weekly triage: export or query `GET /pilot/feedback` (admin), cluster themes, file engineering tickets for fixes; do not use feedback for individual performance management.

## 11. Success metrics

See `docs/pilot-success-metrics.md` (adoption, usefulness, quality, safety, reliability).

## 12. Exit criteria

Pilot may end when exit criteria in `docs/pilot-success-metrics.md` are met or leadership calls pause — document rationale in a short retro.

## 13. Expansion criteria

Readiness gate stable, average feedback and “would use again” above thresholds, no open critical security items, and staffing for support/approvals confirmed.
