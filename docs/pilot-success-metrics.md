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

---

## Improvement metrics

These metrics track the health of the post-pilot improvement loop.

| Metric | Source | Target |
|---|---|---|
| Open high-severity issues | `GET /pilot-improvement/triage/stats` | 0 critical unresolved |
| Triage coverage | % of feedback with triage record | ≥ 90% |
| Backlog items accepted | Count in `accepted` + `in_progress` status | Trend up weekly |
| Improvements implemented | Count in `implemented` status | Trend up |
| Improvements validated | Count in `validated` status | Matches `implemented` within 2 weeks |

## Regression metrics

| Metric | Source | Target |
|---|---|---|
| Score delta after improvement | `GET /pilot-improvement/regression/:slug` | ≥ 0 (no regression) |
| Improved cases per run | `comparison.improvedCaseIds.length` | Increases sprint-over-sprint |
| Regressed cases per run | `comparison.regressedCaseIds.length` | 0 |
| Unresolved evaluation failures | `comparison.unresolvedIssueCount` | Decreases sprint-over-sprint |

## Backlog metrics

| Metric | Source | Target |
|---|---|---|
| New items per week | Backlog count delta | Stable or decreasing |
| Open high-priority items | `backlogStats.openHighPriorityCount` | ≤ 3 open at any time |
| Average time to validate | `createdAt` → `completedAt` on validated items | ≤ 2 weeks |
| Rejection rate | `rejected / total` | ≤ 20% (high rejection = poor recommendations) |
