import type { AgentWorkflowTemplate } from '../models/agent-intelligence.models';
import type { ConnectorDefinition } from '../models/connector.models';
import type { PilotFeedback, PilotReadinessCheck, PilotSuccessMetric } from '../models/pilot.models';
import type { ToolDefinition } from '../models/tool-definition.models';

const NOW = '2026-05-14T09:30:00.000Z';

export const MOCK_ENTERPRISE_TOOLS: readonly ToolDefinition[] = [
	{
		id: 'tool-rag-policy-search',
		name: 'rag.policy.search',
		description: 'Searches internal policy and enablement documents for grounded answers.',
		category: 'docs',
		riskLevel: 'low',
		enabled: true,
		requiresApproval: false,
		allowedInModes: ['ask', 'plan'],
	},
	{
		id: 'tool-mcp-github-triage',
		name: 'mcp.github.triage',
		description: 'Reads issue and PR context through a governed MCP-style GitHub bridge.',
		category: 'connector',
		riskLevel: 'medium',
		enabled: true,
		requiresApproval: true,
		allowedInModes: ['plan', 'act'],
	},
	{
		id: 'tool-browser-smoke',
		name: 'browser.playwright.smoke',
		description: 'Runs a safe Playwright smoke workflow in a worker sandbox.',
		category: 'testing',
		riskLevel: 'high',
		enabled: true,
		requiresApproval: true,
		allowedInModes: ['act'],
	},
] as const;

export const MOCK_ENTERPRISE_WORKFLOWS: readonly AgentWorkflowTemplate[] = [
	{
		id: 'wf-pilot-onboarding',
		agentSlug: 'producto',
		key: 'pilot-onboarding-readiness',
		name: 'Pilot onboarding readiness check',
		description: 'Validates prompts, guides, and success criteria before a new team joins the pilot.',
		category: 'pilot-ops',
		mode: 'plan',
		requiredTools: ['tool-rag-policy-search'],
		outputArtifactTypes: ['markdown', 'checklist'],
		status: 'active',
		createdAt: NOW,
		updatedAt: NOW,
		steps: [
			{ id: 'wf-step-1', type: 'search_context', title: 'Review pilot policy and prompts' },
			{ id: 'wf-step-2', type: 'approval_gate', title: 'Confirm readiness before rollout', requiresApproval: true },
			{ id: 'wf-step-3', type: 'final_summary', title: 'Publish rollout summary' },
		],
	},
	{
		id: 'wf-tool-recovery',
		agentSlug: 'testo',
		key: 'playwright-worker-recovery',
		name: 'Playwright worker recovery loop',
		description: 'Captures a failed test run, creates an approval gate, and prepares a retry plan.',
		category: 'ops',
		mode: 'act',
		requiredTools: ['tool-browser-smoke'],
		outputArtifactTypes: ['test', 'markdown'],
		status: 'active',
		createdAt: NOW,
		updatedAt: NOW,
		steps: [
			{ id: 'wf-step-4', type: 'test_action', title: 'Run smoke workflow' },
			{ id: 'wf-step-5', type: 'approval_gate', title: 'Review retry recommendation', requiresApproval: true },
			{ id: 'wf-step-6', type: 'final_summary', title: 'Summarize failure and retry plan' },
		],
	},
] as const;

export const MOCK_ENTERPRISE_APPROVALS = [
	{
		id: 'approval-prod-ticket',
		agentSlug: 'supporto',
		title: 'Approve customer escalation draft',
		riskLevel: 'high',
		status: 'pending',
		owner: 'Ops lead',
		note: 'Customer-facing change requires review before send.',
	},
	{
		id: 'approval-browser-worker',
		agentSlug: 'testo',
		title: 'Approve Playwright worker retry',
		riskLevel: 'medium',
		status: 'pending',
		owner: 'QA lead',
		note: 'Retry against staging only after recovery checklist is attached.',
	},
] as const;

export const MOCK_PILOT_FEEDBACK: readonly PilotFeedback[] = [
	{
		id: 'feedback-1',
		userRole: 'frontend_engineer',
		agentSlug: 'fronto',
		rating: 4,
		taskType: 'ui-refactor',
		whatWorked: 'Generated a useful component split and artifact summary.',
		whatFailed: 'Needed stronger context around accessibility constraints.',
		timeSavedMinutes: 35,
		wouldUseAgain: true,
		notes: 'Wanted clearer RAG source card provenance in the final answer.',
		userId: 'demo-user-1',
		userEmail: 'frontend-lead@example.com',
		createdAt: NOW,
	},
	{
		id: 'feedback-2',
		userRole: 'qa_engineer',
		agentSlug: 'testo',
		rating: 3,
		taskType: 'playwright-smoke',
		whatWorked: 'The worker replay and test artifacts were easy to review.',
		whatFailed: 'Needed a clearer recovery summary after the failed worker action.',
		timeSavedMinutes: 18,
		wouldUseAgain: true,
		notes: 'Add approval audit log and evaluation dashboard next.',
		userId: 'demo-user-2',
		userEmail: 'qa-lead@example.com',
		createdAt: '2026-05-13T14:10:00.000Z',
	},
] as const;

export const MOCK_PILOT_METRICS: readonly PilotSuccessMetric[] = [
	{
		id: 'pilot-metric-1',
		label: 'Weekly pilot sessions',
		value: 47,
		target: 40,
		status: 'good',
		description: 'Internal teams are using the workspace enough to generate signal.',
	},
	{
		id: 'pilot-metric-2',
		label: 'Approval completion rate',
		value: '91%',
		target: '90%',
		status: 'good',
		description: 'Approval-first flows are being completed instead of bypassed.',
	},
	{
		id: 'pilot-metric-3',
		label: 'Recovery path clarity',
		value: 'Needs work',
		target: 'Clear by launch',
		status: 'warning',
		description: 'Pilot feedback shows recovery UX still needs stronger guidance.',
	},
] as const;

export const MOCK_PILOT_READINESS: readonly PilotReadinessCheck[] = [
	{
		id: 'readiness-1',
		category: 'security',
		title: 'Secrets and RBAC reviewed',
		description: 'Environment templates and permission boundaries checked for demo use.',
		status: 'passed',
		severity: 'critical',
		owner: 'Platform admin',
	},
	{
		id: 'readiness-2',
		category: 'tooling',
		title: 'Browser worker demo limited to safe targets',
		description: 'Playwright worker remains mock-governed and staged behind approval.',
		status: 'warning',
		severity: 'high',
		owner: 'QA lead',
		recommendation: 'Keep localhost and staging-only guardrails in place.',
	},
	{
		id: 'readiness-3',
		category: 'pilot-ops',
		title: 'Feedback loop active',
		description: 'Pilot feedback, triage, and improvement backlog are visible.',
		status: 'passed',
		severity: 'medium',
		owner: 'Pilot program lead',
	},
] as const;

export const MOCK_CONNECTORS: readonly ConnectorDefinition[] = [
	{
		id: 'connector-github',
		provider: 'github',
		type: 'repository',
		name: 'GitHub MCP bridge',
		description: 'Read-only repository and issue inspection via governed connector.',
		enabled: true,
		readOnly: true,
		status: 'healthy',
		capabilities: ['issues', 'pull requests', 'repository search'],
	},
	{
		id: 'connector-confluence',
		provider: 'confluence',
		type: 'docs',
		name: 'Confluence knowledge bridge',
		description: 'Reads internal playbooks and knowledge pages into the RAG layer.',
		enabled: true,
		readOnly: true,
		status: 'healthy',
		capabilities: ['docs search', 'runbooks', 'knowledge sync'],
	},
] as const;

export const MOCK_ADMIN_SUMMARY: Record<string, unknown> = {
	users: { active: 24 },
	agents: {
		readyCount: 8,
		priorityCount: 8,
		readiness: [
			{ slug: 'fronto', score: 91, checks: ['prompts', 'tools', 'streaming'] },
			{ slug: 'testo', score: 86, checks: ['browser worker', 'approval', 'artifacts'] },
			{ slug: 'producto', score: 82, checks: ['workflow templates', 'pilot prompts'] },
		],
	},
	approvals: { pending: MOCK_ENTERPRISE_APPROVALS.length },
	runs: { failedToday: 2 },
	tools: { failedExecutionsToday: 1 },
	evaluations: { averageScore: 0.84 },
	database: { ok: true },
	productionSafety: { ok: false, warningCount: 2 },
	provider: {
		mode: 'mock-and-provider-ready',
		sseStreaming: true,
		note: 'Prototype stack with mock-safe defaults and provider routing hooks.',
	},
	mcp: {
		enabled: true,
		servers: 2,
		note: 'MCP-style integrations are modeled and admin-governed.',
	},
	connectors: {
		healthy: 2,
		types: ['github', 'confluence'],
	},
	recentActivity: [
		{
			id: 'activity-1',
			createdAt: NOW,
			action: 'approval_required',
			actorEmail: 'qa-lead@example.com',
			agentSlug: 'testo',
		},
		{
			id: 'activity-2',
			createdAt: '2026-05-14T08:55:00.000Z',
			action: 'pilot_feedback_received',
			actorEmail: 'frontend-lead@example.com',
			agentSlug: 'fronto',
		},
	],
};
