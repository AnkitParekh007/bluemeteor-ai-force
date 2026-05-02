import type { AgentTaskTemplate } from '../models/agent-chat.models';

const t = (
	id: string,
	title: string,
	description: string,
	category: string,
	prompt: string,
): AgentTaskTemplate => ({ id, title, description, category, prompt });

/**
 * Curated quick-start prompts for internal company workbench (first tranche).
 * Keyed by agent slug; empty array means use generic fallbacks in the UI.
 */
export const AGENT_TASK_TEMPLATES: Readonly<Record<string, readonly AgentTaskTemplate[]>> = {
	fronto: [
		t(
			'fronto-auth-ui',
			'Authenticated dashboard UI',
			'Inspect UI after login with a saved profile.',
			'Quality',
			'Open the authenticated dashboard, capture a screenshot, and inspect the DOM for responsive and accessibility issues after login.',
		),
		t(
			'fronto-a11y-audit',
			'Accessibility pass',
			'Review a screen or flow for WCAG-style issues and fixes.',
			'Quality',
			'I need an accessibility review of our checkout step. List likely violations (focus, contrast, labels, keyboard paths) and concrete fixes for our Angular + design system stack.',
		),
		t(
			'fronto-perf',
			'Bundle & render plan',
			'Outline how to profile and reduce LCP/INP for a route.',
			'Performance',
			'We are seeing slow LCP on the dashboard home. Propose a profiling order (Chrome + Angular), the top 5 likely causes, and a week-one remediation plan with tradeoffs.',
		),
		t(
			'fronto-ds',
			'Design system alignment',
			'Map a Figma spec to implementation tasks.',
			'Design',
			'Here is a new filter bar pattern. Break it into tokens, components, and storybook states. Call out where our existing primitives can be reused vs. net-new work.',
		),
	],
	backo: [
		t(
			'backo-api',
			'API contract review',
			'Shape a versioned REST contract for a new feature.',
			'API',
			'We are adding a "work order" resource. Draft resource shape, error model, pagination, and idempotency for POST. Note breaking-change policy for v1 → v2.',
		),
		t(
			'backo-data',
			'Data model sketch',
			'Propose tables/indices and migration steps.',
			'Data',
			'Model work orders, assignments, and audit events in PostgreSQL. Include key indices, soft-delete approach, and how we avoid N+1 in list queries.',
		),
		t(
			'backo-events',
			'Eventing plan',
			'Outbox / async integration outline.',
			'Integration',
			'We need to emit domain events to a message bus. Propose an outbox table, retry policy, and how consumers stay idempotent.',
		),
	],
	testo: [
		t(
			'testo-login-smoke',
			'Login smoke test',
			'Run controlled Playwright login template.',
			'Automation',
			'Run login smoke test against the local test target using my saved browser profile if available.',
		),
		t(
			'testo-auth-capture',
			'Save browser login session',
			'Manual capture flow in browser preview.',
			'Automation',
			'Start browser login capture for the local app. I will sign in in the preview, then save the session.',
		),
		t(
			'testo-pyramid',
			'Test strategy',
			'Balance unit, contract, and e2e for a release.',
			'Strategy',
			'We ship a payment retry feature next sprint. Propose the test pyramid: what is unit vs. contract vs. e2e, what to mock, and a minimal critical path set for CI.',
		),
		t(
			'testo-e2e',
			'E2E plan',
			'Playwright/Cypress structure and flakiness controls.',
			'Automation',
			'Design a Playwright structure for our app: fixtures, data setup, network stubbing, and how we quarantine flaky tests without hiding regressions.',
		),
		t(
			'testo-ci',
			'CI gates',
			'Quality gates for merge and release.',
			'CI',
			'Recommend CI gates: coverage thresholds, visual diff policy, smoke suite timing, and when to block deploy vs. warn.',
		),
	],
	producto: [
		t(
			'producto-prd',
			'PRD outline',
			'Problem, goals, non-goals, metrics.',
			'Discovery',
			'Help me draft a PRD for an internal "agent run history" feature: problem statement, success metrics, non-goals, rollout plan, and open questions for eng/design.',
		),
		t(
			'producto-prioritize',
			'RICE / tradeoffs',
			'Compare options under constraints.',
			'Prioritization',
			'We can either ship SSO hardening or analytics dashboards next quarter. Compare using impact, risk, and dependencies; recommend a decision with rationale.',
		),
		t(
			'producto-stakeholder',
			'Stakeholder brief',
			'One-pager for leadership.',
			'Comms',
			'Write a one-page exec brief explaining why we are investing in an internal agent workbench and what we will measure in 90 days.',
		),
	],
	doco: [
		t(
			'doco-runbook',
			'Runbook draft',
			'Operational steps and rollback.',
			'Ops',
			'Draft a runbook for deploying the agent workbench: pre-checks, deploy order, smoke tests, rollback steps, and who to page.',
		),
		t(
			'doco-arch',
			'Architecture overview',
			'Explain system context for new hires.',
			'Architecture',
			'Produce a concise architecture overview: major services, data flows, auth boundaries, and where secrets live—suitable for internal wiki.',
		),
		t(
			'doco-api-doc',
			'API doc skeleton',
			'Endpoints, examples, errors.',
			'API',
			'Generate an OpenAPI-style outline for our internal chat API: auth header, rate limits, example request/response, and common error codes.',
		),
	],
	dato: [
		t(
			'dato-quality',
			'Data quality checks',
			'Great expectations / SQL checks.',
			'Quality',
			'We ingest CRM deals nightly. Propose data quality checks (freshness, null rates, referential integrity) and how we alert owners.',
		),
		t(
			'dato-model',
			'Dimensional sketch',
			'Facts and dimensions for analytics.',
			'Modeling',
			'Sketch a star schema for agent usage analytics: facts, dimensions, grain, and 5 core KPIs leadership will ask for.',
		),
		t(
			'dato-pipeline',
			'Pipeline incident',
			'Triage a failed job.',
			'Ops',
			'Our dbt job failed at the staging layer. Provide a triage checklist: logs to inspect, common root causes, and safe backfill steps.',
		),
	],
	supporto: [
		t(
			'supporto-ticket',
			'Ticket response',
			'Customer-ready reply draft.',
			'CX',
			'Draft a calm, accurate reply to a customer who cannot access the workspace after SSO cutover. Include verification steps and escalation path.',
		),
		t(
			'supporto-kb',
			'KB article',
			'Self-serve troubleshooting.',
			'Knowledge',
			'Write a short KB article: "Clear workspace cache and re-authenticate" with numbered steps for Chrome/Edge and mobile Safari.',
		),
		t(
			'supporto-sev',
			'Severity rubric',
			'Classify and route incidents.',
			'Process',
			'Define P1–P4 criteria for our SaaS product with examples, initial response times, and communication templates.',
		),
	],
	devopsy: [
		t(
			'devopsy-ci',
			'Pipeline hardening',
			'Secrets, caches, runners.',
			'CI/CD',
			'Review our GitHub Actions pipeline for supply-chain basics: pinned actions, OIDC to cloud, cache poisoning risks, and branch protection alignment.',
		),
		t(
			'devopsy-deploy',
			'Blue/green outline',
			'Safe deploy pattern.',
			'Release',
			'Outline a blue/green deploy for our containerized API: health checks, traffic shift, database migrations strategy, and rollback triggers.',
		),
		t(
			'devopsy-obs',
			'Observability',
			'Logs, metrics, traces.',
			'SRE',
			'Propose golden signals dashboards for the agent workbench API: RED metrics, SLO draft, and alert thresholds that avoid pager fatigue.',
		),
	],
};

export function taskTemplatesForSlug(slug: string): readonly AgentTaskTemplate[] {
	const list = AGENT_TASK_TEMPLATES[slug];
	return list ?? [];
}
