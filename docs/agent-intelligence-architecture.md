# Agent intelligence layer

Configurable prompts, skill packs, workflow templates, and an evaluation harness sit **above** the existing orchestrator and tool executor. Hardcoded `INTERNAL_AGENT_CONFIGS` remain the fallback when no registry data exists.

## Components

- **Prompt registry** — `AgentPromptTemplate` rows; active `system` template is rendered with safe `{{variable}}` substitution before RAG augmentation. Events: `prompt_template_loaded`, `prompt_template_rendered`.
- **Skill packs** — `AgentSkillPack` groups tools, prompt template ids, workflow template ids, and knowledge source hints. Active packs extend **allowed tools** via `ToolPermissionService` (denied tools still win).
- **Workflow templates** — `AgentWorkflowTemplate` defines ordered steps. `AgentWorkflowTemplateService.matchWorkflowForPrompt` does keyword routing first; matched workflows emit `workflow_selected` and per-step `workflow_step_started` / `workflow_step_completed`. If no match, the legacy keyword planner runs unchanged.
- **Evaluation harness** — `AgentEvaluationCase` golden prompts; `AgentEvaluationService.runEvaluation` creates a real session, runs `executeMessage` with `context.evaluation`, blocks high-risk tools by default, auto-approves tool gates for the run, scores outputs with `AgentQualityScorerService`, and persists `AgentEvaluationRun` + `AgentEvaluationCaseResult`. Events: `evaluation_run_started`, `evaluation_run_completed` (on the eval session).

## Safety

- Prompt rendering is literal string replacement only (no `eval`).
- Skill packs cannot override `deniedTools` or RBAC; `ToolPermissionService` remains authoritative.
- Evaluation uses `EVALUATION_TOOL_BLOCKLIST` unless `evalAllowBrowserAndTestTools` is explicitly true.
- Template size caps and per-run case caps are enforced server-side.

## API surface

Base path: `/agent-intelligence/...` (see `server/README.md`). Read routes require `agents.readiness.view`; writes require `agents.manage`.

## Seeding

`AgentIntelligenceSeedService` runs on startup when the prompt table is empty (override with `AGENT_INTEL_SEED=0`). Idempotent upserts use deterministic ids (`seed_pt_*`, `seed_wf_*`, etc.).

## Adding a new agent skill

1. Add or reuse tools in the static agent config and tool catalog.
2. Create workflow rows (optional) and skill pack rows linking tool ids and workflow ids.
3. Add prompt templates if the agent needs custom system text.
4. Add evaluation cases with `expectedBehaviors`, optional `expectedTools` / `expectedArtifacts`.

## Adding evaluation cases

Use `POST /agent-intelligence/evaluations/cases` (or Prisma) with `inputPrompt` and expectations. Keep prompts focused; prefer `plan` mode compatible prompts.

## Roadmap

- LLM-based workflow classifier
- Prompt A/B versioning analytics
- PostgreSQL-backed migrations in CI
- Per-agent evaluation budgets and scheduling
