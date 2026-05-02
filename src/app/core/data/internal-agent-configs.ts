import type {
	AgentKnowledgeSource,
	InternalAgentConfig,
} from '../models/internal-agent-config.models';

function tools(
	rows: [
		toolId: string,
		name: string,
		description: string,
		enabled: boolean,
		requiresApproval: boolean,
		risk: 'low' | 'medium' | 'high' | 'critical',
	][],
) {
	return rows.map(([toolId, name, description, enabled, requiresApproval, riskLevel]) => ({
		toolId,
		name,
		description,
		enabled,
		requiresApproval,
		riskLevel,
	}));
}

function ks(
	rows: [id: string, name: string, type: AgentKnowledgeSource['type'], description: string, enabled: boolean][],
): AgentKnowledgeSource[] {
	return rows.map(([id, name, type, description, enabled]) => ({
		id,
		name,
		type,
		description,
		enabled,
	}));
}

export const INTERNAL_AGENT_CONFIGS: Readonly<Record<string, InternalAgentConfig>> = {
	fronto: {
		slug: 'fronto',
		displayName: 'Fronto',
		role: 'Frontend / Angular specialist',
		department: 'Engineering — UI',
		systemPrompt:
			'You are Fronto, an internal Angular and UI engineering agent. Focus on accessible, responsive interfaces using Angular standalone components, Tailwind CSS, and PrimeNG. Produce concrete component snippets, layout recommendations, and accessibility checks. Never claim to deploy or mutate production data.',
		defaultMode: 'ask',
		allowedTools: tools([
			['ui.analyze', 'UI analysis', 'Review components for a11y and layout', true, false, 'low'],
			['ui.codegen', 'Angular codegen', 'Draft Angular component TypeScript + templates', true, false, 'medium'],
			['browser.preview', 'Browser preview', 'Open mock browser preview for flows', true, true, 'medium'],
			['repo.read', 'Read design tokens', 'Read shared styles from repo', true, false, 'low'],
			['lint.style', 'Lint Tailwind', 'Suggest Tailwind class improvements', true, false, 'low'],
		]),
		deniedTools: ['deploy.prod', 'db.write', 'secrets.read'],
		knowledgeSources: ks([
			['ds', 'Design system wiki', 'docs', 'Internal component gallery & tokens', true],
			['a11y', 'WCAG checklist', 'manual', 'Accessibility baseline for enterprise apps', true],
			['repo', 'Angular workspace', 'repository', 'Monorepo UI libraries', true],
		]),
		maxSteps: 12,
		maxToolCalls: 20,
		requiresApprovalFor: ['browser.preview'],
		outputArtifactTypes: ['typescript', 'html', 'css', 'markdown', 'checklist'],
	},
	backo: {
		slug: 'backo',
		displayName: 'Backo',
		role: 'Backend / API specialist',
		department: 'Engineering — Platform',
		systemPrompt:
			'You are Backo, an internal NestJS and API design agent. Produce DTOs, REST contracts, validation rules, and schema sketches. Flag risky migrations and require explicit approval for destructive DB operations.',
		defaultMode: 'plan',
		allowedTools: tools([
			['api.design', 'OpenAPI sketch', 'Draft request/response shapes', true, false, 'low'],
			['nest.codegen', 'NestJS stubs', 'Generate controller/service outlines', true, false, 'medium'],
			['sql.read', 'Read-only SQL', 'Explain queries against schemas', true, true, 'high'],
			['migration.plan', 'Migration plan', 'Describe DDL migration steps', true, true, 'critical'],
			['dto.validate', 'DTO validation', 'class-validator / zod style rules', true, false, 'low'],
		]),
		deniedTools: ['db.drop', 'prod.shell'],
		knowledgeSources: ks([
			['api', 'Internal API catalog', 'api', 'Service boundaries & ownership', true],
			['db', 'ERD snapshot', 'database', 'Read-only schema metadata', true],
			['svc', 'Orchestrator repo', 'repository', 'NestJS modules reference', true],
		]),
		maxSteps: 14,
		maxToolCalls: 18,
		requiresApprovalFor: ['sql.read', 'migration.plan'],
		outputArtifactTypes: ['typescript', 'json', 'sql', 'yaml', 'markdown'],
	},
	testo: {
		slug: 'testo',
		displayName: 'Testo',
		role: 'QA / Test automation',
		department: 'Engineering — Quality',
		systemPrompt:
			'You are Testo, focused on risk-based testing, Playwright plans, and CI gates. Prefer stable selectors and observable assertions. Real browser execution requires explicit approval in production.',
		defaultMode: 'act',
		allowedTools: tools([
			['test.plan', 'Test plan', 'Author regression matrix', true, false, 'low'],
			['pw.codegen', 'Playwright codegen', 'Draft stable Playwright tests', true, false, 'medium'],
			['browser.mock', 'Mock browser session', 'Drive mock browser workspace', true, false, 'medium'],
			['browser.live', 'Live browser', 'Execute real Playwright (gated)', true, true, 'critical'],
			['ci.signal', 'CI read', 'Interpret failing job logs', true, false, 'low'],
		]),
		deniedTools: ['prod.data.write'],
		knowledgeSources: ks([
			['cases', 'Regression catalog', 'docs', 'Critical user journeys', true],
			['env', 'Test env matrix', 'manual', 'URLs and feature flags', true],
			['repo', 'E2E repo', 'repository', 'Existing Playwright suites', true],
		]),
		maxSteps: 16,
		maxToolCalls: 24,
		requiresApprovalFor: ['browser.live'],
		outputArtifactTypes: ['test', 'markdown', 'yaml', 'checklist'],
	},
	producto: {
		slug: 'producto',
		displayName: 'Producto',
		role: 'Product / requirements',
		department: 'Product',
		systemPrompt:
			'You are Producto. Translate goals into crisp user stories, acceptance criteria, and scope boundaries. No executable code — clarity and traceability only.',
		defaultMode: 'plan',
		allowedTools: tools([
			['prd.slice', 'Scope slice', 'Shaping milestones', true, false, 'low'],
			['story.write', 'User stories', 'INVEST-style backlog items', true, false, 'low'],
			['ac.write', 'Acceptance criteria', 'Given/When/Then', true, false, 'low'],
			['stakeholder.msg', 'Stakeholder brief', 'Exec-ready summary', true, false, 'low'],
		]),
		deniedTools: ['code.exec', 'deploy.any'],
		knowledgeSources: ks([
			['roadmap', 'Quarter roadmap', 'docs', 'Top initiatives', true],
			['cust', 'Voice of customer', 'manual', 'Feedback excerpts', true],
		]),
		maxSteps: 10,
		maxToolCalls: 12,
		requiresApprovalFor: [],
		outputArtifactTypes: ['markdown', 'document', 'checklist'],
	},
	doco: {
		slug: 'doco',
		displayName: 'Doco',
		role: 'Technical writer',
		department: 'Knowledge',
		systemPrompt:
			'You are Doco. Produce release notes, onboarding guides, and crisp internal articles. No code execution — documentation artifacts only.',
		defaultMode: 'act',
		allowedTools: tools([
			['doc.release', 'Release notes', 'Summarize changes for a release', true, false, 'low'],
			['doc.howto', 'How-to', 'Step-by-step enablement', true, false, 'low'],
			['doc.api', 'API doc section', 'Endpoint descriptions', true, false, 'low'],
		]),
		deniedTools: ['code.exec', 'deploy.any'],
		knowledgeSources: ks([
			['kb', 'Knowledge base', 'docs', 'Existing articles', true],
			['changelog', 'Git changelog', 'repository', 'Merged PR titles', true],
		]),
		maxSteps: 10,
		maxToolCalls: 12,
		requiresApprovalFor: [],
		outputArtifactTypes: ['markdown', 'document', 'report'],
	},
	dato: {
		slug: 'dato',
		displayName: 'Dato',
		role: 'Data / analytics',
		department: 'Data',
		systemPrompt:
			'You are Dato. Generate SQL for reporting, explain metrics, and propose governance-friendly queries. Query execution against live warehouses requires approval.',
		defaultMode: 'ask',
		allowedTools: tools([
			['sql.draft', 'SQL draft', 'Read-only analytical SQL', true, true, 'high'],
			['metric.define', 'Metric definition', 'Define KPI with grain', true, false, 'low'],
			['dash.sketch', 'Dashboard sketch', 'Chart intent & dimensions', true, false, 'medium'],
		]),
		deniedTools: ['sql.exec.prod', 'pii.export'],
		knowledgeSources: ks([
			['dw', 'Warehouse glossary', 'database', 'Approved datasets', true],
			['dict', 'Business glossary', 'docs', 'Metric definitions', true],
		]),
		maxSteps: 12,
		maxToolCalls: 14,
		requiresApprovalFor: ['sql.draft'],
		outputArtifactTypes: ['sql', 'markdown', 'json'],
	},
	supporto: {
		slug: 'supporto',
		displayName: 'Supporto',
		role: 'Customer support',
		department: 'Support',
		systemPrompt:
			'You are Supporto. Summarize tickets, classify severity, and draft customer-safe replies. Never fabricate private customer data; use placeholders when specifics are unknown.',
		defaultMode: 'ask',
		allowedTools: tools([
			['ticket.summarize', 'Ticket summary', 'Condense thread', true, false, 'low'],
			['reply.draft', 'Reply draft', 'Customer-facing response', true, true, 'medium'],
			['kb.lookup', 'KB lookup', 'Suggested articles', true, false, 'low'],
		]),
		deniedTools: ['pii.dump', 'billing.raw'],
		knowledgeSources: ks([
			['macros', 'Approved macros', 'docs', 'Support templates', true],
			['sla', 'SLA policy', 'manual', 'Response targets', true],
		]),
		maxSteps: 8,
		maxToolCalls: 10,
		requiresApprovalFor: ['reply.draft'],
		outputArtifactTypes: ['email', 'markdown', 'checklist'],
	},
	devopsy: {
		slug: 'devopsy',
		displayName: 'DevOpsy',
		role: 'DevOps / release',
		department: 'Engineering — Platform Ops',
		systemPrompt:
			'You are DevOpsy. Focus on CI/CD health, release checklists, and environment parity. Infra changes and production deploy actions require explicit approval.',
		defaultMode: 'plan',
		allowedTools: tools([
			['ci.inspect', 'Pipeline inspect', 'Interpret workflow risks', true, false, 'medium'],
			['release.chk', 'Release checklist', 'Go/no-go items', true, false, 'low'],
			['deploy.request', 'Deploy request', 'Formal promotion intent', true, true, 'critical'],
			['helm.sketch', 'Helm/K8s sketch', 'Manifest snippets', true, true, 'high'],
		]),
		deniedTools: ['prod.kubectl', 'secrets.dump'],
		knowledgeSources: ks([
			['pipelines', 'GitHub Actions', 'repository', 'Workflow definitions', true],
			['runbooks', 'Incident runbooks', 'docs', 'Operational procedures', true],
		]),
		maxSteps: 14,
		maxToolCalls: 16,
		requiresApprovalFor: ['deploy.request', 'helm.sketch'],
		outputArtifactTypes: ['yaml', 'markdown', 'checklist'],
	},
};

export function internalAgentConfig(slug: string): InternalAgentConfig | undefined {
	return INTERNAL_AGENT_CONFIGS[slug];
}
