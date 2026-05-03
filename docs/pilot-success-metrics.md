# Pilot success metrics

## Adoption

- Active pilot users (distinct `userId` on `pilot_feedback` and session usage where available).
- Sessions per user (from runtime/admin summaries when wired).
- Agents used per role (`GET /pilot/metrics` → `byRole`).

## Usefulness

- Average feedback rating (`feedback.averageRating`).
- Would-use-again percentage (`feedback.wouldUseAgainPercent`).
- Estimated minutes saved sum (`feedback.estimatedTimeSavedMinutesTotal`).

## Quality

- Evaluation score per agent (from admin summary / agent intelligence).
- Failed run rate (`adminSummarySnippet.runs`, ops metrics).
- Artifact usefulness (optional future field; not required for pilot v1).

## Safety

- Permission denials and blocked tools (audit / security health — admin views).
- Approval requests volume and rejection rate (`admin` approvals).

## Reliability

- Backend uptime / `/ready` status.
- SSE or provider error rates (ops metrics, logs — admin only).
- Tool and browser/test failure rates (ops + admin summaries).

## Exit criteria (example)

- At least **10** pilot users and **50** sessions (adjust to your org).
- Average rating **≥ 4/5** and would-use-again **≥ 70%**.
- No **critical** security incidents during pilot.
- Fronto / Testo / Producto / Doco readiness **≥ 70** where measured.
- Admin/ops monitoring and feedback pipeline confirmed working.
