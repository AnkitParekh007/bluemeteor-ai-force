# Pilot Feedback Improvement Loop

This document describes the continuous improvement system that turns pilot feedback into structured agent improvements.

---

## Overview

The improvement loop moves from:

```
User submits feedback
  ↓
System classifies feedback (triage)
  ↓
Admin reviews issues (feedback queue)
  ↓
System recommends prompt/workflow/evaluation updates (recommendations)
  ↓
Admin accepts selected improvements (backlog)
  ↓
Evaluation runs again
  ↓
Readiness score updates
  ↓
Pilot report shows before/after progress
```

---

## How Feedback Is Triaged

Triage runs automatically using rule-based classification. No external provider is required.

### Running triage

1. Open `/pilot/improvements`
2. Click **Run triage**
3. The system scans all pilot feedback and classifies each item

Alternatively, individual feedback items can be triaged via:

```
POST /pilot-improvement/triage/:feedbackId
```

### What triage produces

For each feedback item, triage produces a `PilotFeedbackTriage` record with:

- **category** — the nature of the failure
- **severity** — how serious the issue is
- **rootCause** — likely technical root cause
- **recommendedAction** — suggested next step
- **summary** — short human-readable description

---

## Categories and Severities

### Triage Categories

| Category | Meaning |
|---|---|
| `wrong_answer` | Agent gave factually incorrect answer |
| `incomplete_answer` | Response was partially correct but missing sections |
| `bad_format` | Response was correct but poorly structured |
| `missing_artifact` | Expected file/code/document was not generated |
| `wrong_tool_used` | Agent chose an inappropriate tool |
| `tool_failed` | Tool execution error during the run |
| `browser_failed` | Browser automation or Playwright failure |
| `slow_response` | Response took too long |
| `permission_issue` | Access denied error for user or connector |
| `hallucination` | Agent invented information not in context |
| `poor_prompt_understanding` | Agent misunderstood the request |
| `missing_context` | Agent lacked required domain knowledge |
| `ui_issue` | Frontend rendering or display problem |
| `other` | Does not match a known pattern |

### Severity Levels

| Severity | When assigned |
|---|---|
| `critical` | Rating 1, or hallucination/permission issue at rating 2 |
| `high` | Rating 2 (most categories), or rating 3 for wrong/missing/tool/browser |
| `medium` | Rating 3 for context/format/prompt issues |
| `low` | Rating 4–5 or format/slow issues |

### Triage Statuses

| Status | Meaning |
|---|---|
| `new` | Just classified |
| `triaged` | Reviewed by a human |
| `planned` | Linked to a backlog item or evaluation case |
| `in_progress` | Actively being worked |
| `resolved` | Fix applied |
| `wont_fix` | Accepted as known limitation |

---

## How the Backlog Is Created

Improvement backlog items are created in three ways:

1. **From recommendations** — Click "Generate recommendations" to automatically create backlog items from triaged feedback
2. **From failed runs** — `POST /pilot-improvement/recommendations/failed-runs/:agentSlug`
3. **From evaluation failures** — `POST /pilot-improvement/recommendations/evaluation-failures/:agentSlug`
4. **Manually** — Admin creates an item via the Backlog tab or API

### Backlog item lifecycle

```
new → accepted → in_progress → implemented → validated → closed
              ↘ rejected
```

Admins must explicitly **accept** items before they enter the in-progress state. Recommendations are never auto-applied.

---

## How Recommendations Work

The `AgentImprovementRecommendationService` maps triage categories to a set of pre-defined improvement specs.

For each category, the system generates 1–2 backlog items. For example:

- `hallucination` → "Add anti-hallucination prompt rule" (critical) + "Create evaluation case" (critical)
- `missing_artifact` → "Update workflow template" (high) + "Create evaluation case" (high)
- `wrong_answer` → "Add grounding and citation rules to prompt" (high) + "Create evaluation case" (high)

Each recommendation includes:
- **title** — short description
- **description** — full details
- **category** — what kind of change (prompt, workflow, evaluation_case, etc.)
- **priority** — critical/high/medium/low
- **proposedChange** — the specific suggested text/patch (for admin review)
- **expectedImpact** — what improvement to expect

**Recommendations are suggestions only.** Admins must review and apply changes manually via:
- `/admin/prompts` for prompt changes
- `/admin/workflows` for workflow changes
- `/admin/evaluations` for evaluation cases

---

## How to Create Evaluation Cases from Feedback

### From the UI

1. In the Feedback queue tab, find a triaged item
2. Click **+ Eval case**
3. Confirm the dialog

### From the API

```
POST /pilot-improvement/evaluation-case/from-feedback/:feedbackId
POST /pilot-improvement/evaluation-case/from-backlog/:backlogItemId
```

### What is generated

The system creates an `AgentEvaluationCase` with:
- `inputPrompt` from `feedback.taskType`
- `expectedBehaviors` derived from the failure description
- `expectedArtifacts` inferred from the triage category (e.g. `test/playwright_spec` for `missing_artifact` + Playwright keywords)
- `status: active`
- `category: regression`
- `priority` mapped from rating + severity

---

## How to Validate Improvements

After an admin applies a prompt/workflow change manually:

1. Run an evaluation for the agent via `/admin/evaluations`
2. Return to `/pilot/improvements` → Agent regression tab
3. Check the score delta
4. If the score improved and the issue no longer reproduces, mark the backlog item as **Validated**
5. The system records the before/after scores in the regression summary

---

## Weekly Pilot Improvement Process

**Recommended cadence (weekly):**

1. **Run triage** — classify all new feedback
2. **Review feedback queue** — look at high/critical severity items
3. **Generate recommendations** — create backlog items from triaged feedback
4. **Accept/reject items** — admin reviews each recommendation
5. **Apply changes** — manually edit prompts/workflows/evaluations in admin console
6. **Mark implemented** — update backlog status
7. **Run evaluations** — evaluate affected agents
8. **Review regression tab** — check before/after score
9. **Mark validated** — confirm improvements held
10. **Download improvement report** — share with team

---

## API Reference

| Endpoint | Description |
|---|---|
| `GET /pilot-improvement/triage` | List triage records |
| `POST /pilot-improvement/triage/run` | Run triage on all feedback |
| `POST /pilot-improvement/triage/:feedbackId` | Triage one feedback item |
| `PATCH /pilot-improvement/triage/:triageId` | Update triage status |
| `GET /pilot-improvement/triage/stats` | Triage stats by category/severity/status |
| `GET /pilot-improvement/backlog` | List backlog items |
| `POST /pilot-improvement/backlog` | Create backlog item |
| `PATCH /pilot-improvement/backlog/:id` | Update backlog item |
| `POST /pilot-improvement/backlog/:id/accept` | Accept item |
| `POST /pilot-improvement/backlog/:id/reject` | Reject item |
| `POST /pilot-improvement/backlog/:id/implemented` | Mark as implemented |
| `POST /pilot-improvement/backlog/:id/validated` | Mark as validated |
| `POST /pilot-improvement/backlog/:id/close` | Close item |
| `POST /pilot-improvement/recommendations/generate` | Generate recommendations from triaged feedback |
| `POST /pilot-improvement/recommendations/failed-runs/:slug` | Generate from failed runs |
| `POST /pilot-improvement/recommendations/evaluation-failures/:slug` | Generate from eval failures |
| `POST /pilot-improvement/evaluation-case/from-feedback/:id` | Create eval case from feedback |
| `POST /pilot-improvement/evaluation-case/from-backlog/:id` | Create eval case from backlog item |
| `GET /pilot-improvement/regression/:agentSlug` | Get regression/improvement summary |
| `GET /pilot-improvement/report` | Get improvement report (JSON + Markdown) |
| `GET /pilot-improvement/report/markdown` | Get markdown report only |
