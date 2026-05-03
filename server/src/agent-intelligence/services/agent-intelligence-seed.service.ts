import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { AgentSkillPackRegistryService } from './agent-skill-pack-registry.service';

const SLUGS = ['fronto', 'testo', 'backo', 'producto', 'doco', 'dato', 'supporto', 'devopsy'] as const;

const PROMPT_VARS = JSON.stringify([
	{ key: 'agentName', description: 'Display name', required: true },
	{ key: 'agentRole', description: 'Role line', required: true },
	{ key: 'mode', description: 'Workspace mode', required: true },
	{ key: 'userMessage', description: 'Latest user message', required: true },
	{ key: 'ragContext', description: 'RAG context', required: false, defaultValue: '' },
	{ key: 'toolResults', description: 'Tool summaries', required: false, defaultValue: '' },
	{ key: 'browserContext', description: 'Browser context', required: false, defaultValue: '' },
	{ key: 'testResults', description: 'Test results', required: false, defaultValue: '' },
	{ key: 'connectorResults', description: 'Connector results', required: false, defaultValue: '' },
]);

@Injectable()
export class AgentIntelligenceSeedService implements OnModuleInit {
	private readonly log = new Logger(AgentIntelligenceSeedService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly skillPacks: AgentSkillPackRegistryService,
	) {}

	async onModuleInit(): Promise<void> {
		if (process.env.AGENT_INTEL_SEED === '0') return;
		try {
			const n = await this.prisma.agentPromptTemplate.count();
			if (n > 0) return;
			await this.seed();
			await this.skillPacks.refreshToolUnionCache();
			this.log.log('Agent intelligence seed completed');
		} catch (e) {
			this.log.warn(`Agent intelligence seed skipped: ${e instanceof Error ? e.message : e}`);
		}
	}

	async seed(): Promise<void> {
		const now = new Date();
		for (const slug of SLUGS) {
			const sysId = `seed_pt_${slug}_system`;
			const rspId = `seed_pt_${slug}_response`;
			await this.prisma.agentPromptTemplate.upsert({
				where: { id: sysId },
				create: {
					id: sysId,
					agentSlug: slug,
					name: 'System',
					description: 'Registry system prompt',
					version: '1.0.0',
					status: 'active',
					type: 'system',
					content:
						'You are {{agentName}}, {{agentRole}}.\n' +
						'Workspace mode: {{mode}}.\n\n' +
						'User message:\n{{userMessage}}\n\n' +
						'Internal knowledge context:\n{{ragContext}}\n\n' +
						'Tool output (read-only):\n{{toolResults}}\n',
					variablesJson: PROMPT_VARS,
					createdAt: now,
					updatedAt: now,
				},
				update: { updatedAt: now, status: 'active' },
			});
			await this.prisma.agentPromptTemplate.upsert({
				where: { id: rspId },
				create: {
					id: rspId,
					agentSlug: slug,
					name: 'Response style',
					version: '1.0.0',
					status: 'active',
					type: 'response_style',
					content: 'Be concise, cite tool outputs, and flag uncertainties.',
					variablesJson: '[]',
					createdAt: now,
					updatedAt: now,
				},
				update: { updatedAt: now },
			});

			const wfDefs = this.workflowsFor(slug);
			const wfIds: string[] = [];
			for (const w of wfDefs) {
				const wid = `seed_wf_${slug}_${w.key}`;
				wfIds.push(wid);
				await this.prisma.agentWorkflowTemplate.upsert({
					where: { agentSlug_key: { agentSlug: slug, key: w.key } },
					create: {
						id: wid,
						agentSlug: slug,
						key: w.key,
						name: w.name,
						category: w.category,
						mode: w.mode,
						stepsJson: JSON.stringify(w.steps),
						requiredToolsJson: JSON.stringify(w.tools),
						outputArtifactTypesJson: JSON.stringify(w.artifacts),
						status: 'active',
						createdAt: now,
						updatedAt: now,
					},
					update: { stepsJson: JSON.stringify(w.steps), updatedAt: now, status: 'active' },
				});
			}

			const packDefs = this.packsFor(slug, wfIds);
			for (const p of packDefs) {
				const pid = `seed_sp_${slug}_${p.key}`;
				await this.prisma.agentSkillPack.upsert({
					where: { id: pid },
					create: {
						id: pid,
						agentSlug: slug,
						key: p.key,
						name: p.name,
						status: 'active',
						toolIdsJson: JSON.stringify(p.tools),
						promptTemplateIdsJson: JSON.stringify([sysId]),
						workflowTemplateIdsJson: JSON.stringify(p.workflowIds),
						knowledgeSourcesJson: JSON.stringify(p.knowledge ?? []),
						createdAt: now,
						updatedAt: now,
					},
					update: {
						toolIdsJson: JSON.stringify(p.tools),
						workflowTemplateIdsJson: JSON.stringify(p.workflowIds),
						updatedAt: now,
						status: 'active',
					},
				});
			}

			const cases = this.evalCasesFor(slug);
			for (const c of cases) {
				const cid = `seed_ec_${slug}_${c.key}`;
				await this.prisma.agentEvaluationCase.upsert({
					where: { agentSlug_key: { agentSlug: slug, key: c.key } },
					create: {
						id: cid,
						agentSlug: slug,
						key: c.key,
						name: c.name,
						inputPrompt: c.prompt,
						expectedBehaviorsJson: JSON.stringify(c.behaviors),
						expectedArtifactsJson: JSON.stringify(c.artifacts),
						expectedToolsJson: JSON.stringify(c.tools),
						category: c.category,
						priority: c.priority,
						status: 'active',
						createdAt: now,
						updatedAt: now,
					},
					update: { inputPrompt: c.prompt, updatedAt: now },
				});
			}
		}
	}

	private workflowsFor(slug: string): Array<{
		key: string;
		name: string;
		category: string;
		mode: 'ask' | 'plan' | 'act';
		steps: { id: string; type: string; title: string; toolId?: string; inputTemplate?: Record<string, unknown> }[];
		tools: string[];
		artifacts: string[];
	}> {
		const mk = (
			key: string,
			name: string,
			category: string,
			mode: 'ask' | 'plan' | 'act',
			steps: { id: string; type: string; title: string; toolId?: string; inputTemplate?: Record<string, unknown> }[],
			tools: string[],
			artifacts: string[],
		) => ({ key, name, category, mode, steps, tools, artifacts });

		switch (slug) {
			case 'fronto':
				return [
					mk(
						'fronto_component_generation',
						'Component generation',
						'ui',
						'plan',
						[
							{ id: 's1', type: 'run_tool', title: 'Repo search', toolId: 'connector_repo_search', inputTemplate: { query: 'supplier upload' } },
							{ id: 's2', type: 'generate_artifact', title: 'Draft component' },
						],
						['connector_repo_search', 'artifact_create_code'],
						['code'],
					),
					mk('fronto_ui_review', 'UI review', 'ui', 'plan', [{ id: 's1', type: 'run_tool', title: 'Inspect', toolId: 'browser_inspect_dom' }], ['browser_inspect_dom'], ['checklist']),
					mk('fronto_accessibility_audit', 'A11y audit', 'ui', 'plan', [{ id: 's1', type: 'generate_artifact', title: 'Checklist' }], ['artifact_create_checklist'], ['checklist']),
					mk('fronto_responsive_layout', 'Responsive layout', 'ui', 'plan', [{ id: 's1', type: 'search_context', title: 'Context' }], ['connector_repo_search'], ['markdown']),
				];
			case 'testo':
				return [
					mk(
						'testo_login_smoke_test',
						'Login smoke',
						'test',
						'plan',
						[
							{ id: 's1', type: 'run_tool', title: 'Profiles', toolId: 'browser_profile_list' },
							{ id: 's2', type: 'run_tool', title: 'Generate spec', toolId: 'playwright_generate_from_template', inputTemplate: { templateKey: 'login_smoke' } },
						],
						['browser_profile_list', 'playwright_generate_from_template'],
						['test'],
					),
					mk('testo_regression_planner', 'Regression planner', 'test', 'plan', [{ id: 's1', type: 'run_tool', title: 'Plan', toolId: 'test_generate_plan' }], ['test_generate_plan'], ['markdown']),
					mk('testo_playwright_spec', 'Playwright spec', 'test', 'plan', [{ id: 's1', type: 'run_tool', title: 'Spec', toolId: 'playwright_generate_spec', inputTemplate: { title: 'spec.ts' } }], ['playwright_generate_spec'], ['test']),
					mk('testo_browser_smoke', 'Browser smoke', 'test', 'plan', [{ id: 's1', type: 'test_action', title: 'Mock smoke' }], ['test_run_smoke_mock'], ['test']),
				];
			case 'backo':
				return [
					mk(
						'backo_api_contract_design',
						'API contract',
						'backend',
						'plan',
						[
							{ id: 's1', type: 'run_tool', title: 'API catalog', toolId: 'api_catalog_search', inputTemplate: { query: 'session' } },
							{ id: 's2', type: 'run_tool', title: 'Repo', toolId: 'connector_repo_search', inputTemplate: { query: 'dto' } },
						],
						['api_catalog_search', 'connector_repo_search'],
						['markdown'],
					),
					mk('backo_dto_generator', 'DTO sketch', 'backend', 'plan', [{ id: 's1', type: 'generate_artifact', title: 'DTO notes' }], ['artifact_create_markdown'], ['markdown']),
					mk('backo_service_review', 'Service review', 'backend', 'plan', [{ id: 's1', type: 'search_context', title: 'Jira', toolId: 'connector_jira_search', inputTemplate: { query: 'api' } }], ['connector_jira_search'], ['markdown']),
					mk('backo_schema_hint', 'Schema hint', 'backend', 'plan', [{ id: 's1', type: 'run_tool', title: 'Schema', toolId: 'db_schema_search', inputTemplate: { query: 'upload' } }], ['db_schema_search'], ['sql']),
				];
			case 'producto':
				return [
					mk(
						'producto_ticket_to_user_stories',
						'Ticket to stories',
						'product',
						'plan',
						[
							{ id: 's1', type: 'run_tool', title: 'Jira', toolId: 'connector_jira_search', inputTemplate: { query: 'supplier' } },
							{ id: 's2', type: 'generate_artifact', title: 'Stories' },
						],
						['connector_jira_search', 'artifact_create_markdown'],
						['markdown'],
					),
					mk('producto_acceptance', 'Acceptance criteria', 'product', 'plan', [{ id: 's1', type: 'generate_artifact', title: 'AC' }], ['artifact_create_markdown'], ['markdown']),
					mk('producto_sprint_scope', 'Sprint scope', 'product', 'plan', [{ id: 's1', type: 'run_tool', title: 'Confluence', toolId: 'connector_confluence_search', inputTemplate: { query: 'roadmap' } }], ['connector_confluence_search'], ['markdown']),
					mk('producto_risks', 'Risks', 'product', 'plan', [{ id: 's1', type: 'generate_artifact', title: 'Risks' }], ['artifact_create_markdown'], ['markdown']),
				];
			case 'doco':
				return [
					mk(
						'doco_release_notes',
						'Release notes',
						'docs',
						'plan',
						[
							{ id: 's1', type: 'run_tool', title: 'Confluence', toolId: 'connector_confluence_search', inputTemplate: { query: 'release' } },
							{ id: 's2', type: 'generate_artifact', title: 'Notes' },
						],
						['connector_confluence_search', 'artifact_create_markdown'],
						['markdown'],
					),
					mk('doco_onboarding', 'Onboarding', 'docs', 'plan', [{ id: 's1', type: 'generate_artifact', title: 'Guide' }], ['artifact_create_markdown'], ['markdown']),
					mk('doco_known_issues', 'Known issues', 'docs', 'plan', [{ id: 's1', type: 'search_context', title: 'Docs' }], ['connector_confluence_search'], ['markdown']),
					mk('doco_api_doc', 'API doc', 'docs', 'plan', [{ id: 's1', type: 'run_tool', title: 'Catalog', toolId: 'api_catalog_search', inputTemplate: { query: 'public' } }], ['api_catalog_search'], ['markdown']),
				];
			case 'dato':
				return [
					mk(
						'dato_failed_upload_report_sql',
						'Failed upload SQL',
						'data',
						'plan',
						[
							{ id: 's1', type: 'run_tool', title: 'Schema', toolId: 'db_schema_search', inputTemplate: { query: 'upload' } },
							{
								id: 's2',
								type: 'run_tool',
								title: 'SQL artifact',
								toolId: 'artifact_create_sql',
								inputTemplate: { title: 'failed_uploads.sql', content: '-- draft\nSELECT 1;\n' },
							},
						],
						['db_schema_search', 'artifact_create_sql'],
						['sql'],
					),
					mk('dato_metrics', 'Metrics', 'data', 'plan', [{ id: 's1', type: 'generate_artifact', title: 'Metric defs' }], ['artifact_create_markdown'], ['markdown']),
					mk('dato_quality', 'Data quality', 'data', 'plan', [{ id: 's1', type: 'search_context', title: 'Tickets' }], ['connector_jira_search'], ['markdown']),
					mk('dato_report_explainer', 'Report explainer', 'data', 'plan', [{ id: 's1', type: 'generate_artifact', title: 'Explain' }], ['artifact_create_markdown'], ['markdown']),
				];
			case 'supporto':
				return [
					mk(
						'supporto_customer_reply',
						'Customer reply',
						'support',
						'plan',
						[
							{ id: 's1', type: 'run_tool', title: 'Support search', toolId: 'connector_support_search', inputTemplate: { query: 'upload' } },
							{ id: 's2', type: 'run_tool', title: 'Draft email', toolId: 'artifact_create_email', inputTemplate: { title: 'Reply', content: 'Hello,\n' } },
						],
						['connector_support_search', 'artifact_create_email'],
						['email'],
					),
					mk('supporto_ticket_summary', 'Ticket summary', 'support', 'plan', [{ id: 's1', type: 'run_tool', title: 'Jira', toolId: 'connector_jira_search', inputTemplate: { query: 'customer' } }], ['connector_jira_search'], ['markdown']),
					mk('supporto_escalation', 'Escalation', 'support', 'plan', [{ id: 's1', type: 'generate_artifact', title: 'Plan' }], ['artifact_create_markdown'], ['markdown']),
					mk('supporto_rca', 'RCA draft', 'support', 'plan', [{ id: 's1', type: 'search_context', title: 'Confluence' }], ['connector_confluence_search'], ['markdown']),
				];
			case 'devopsy':
				return [
					mk(
						'devopsy_release_checklist',
						'Release checklist',
						'devops',
						'plan',
						[
							{ id: 's1', type: 'run_tool', title: 'CI analyze', toolId: 'connector_cicd_analyze' },
							{ id: 's2', type: 'generate_artifact', title: 'Checklist' },
						],
						['connector_cicd_analyze', 'artifact_create_checklist'],
						['checklist'],
					),
					mk('devopsy_cicd_risk', 'CI/CD risk', 'devops', 'plan', [{ id: 's1', type: 'run_tool', title: 'PRs', toolId: 'connector_repo_pull_requests', inputTemplate: { repoSlug: 'bluemeteor-ai-force', state: 'OPEN' } }], ['connector_repo_pull_requests'], ['markdown']),
					mk('devopsy_rollback', 'Rollback plan', 'devops', 'plan', [{ id: 's1', type: 'generate_artifact', title: 'Rollback' }], ['artifact_create_markdown'], ['markdown']),
					mk('devopsy_env_debug', 'Env debug', 'devops', 'plan', [{ id: 's1', type: 'search_context', title: 'Repo' }], ['connector_repo_search'], ['markdown']),
				];
			default:
				return [];
		}
	}

	private packsFor(
		slug: string,
		wfIds: string[],
	): Array<{ key: string; name: string; tools: string[]; workflowIds: string[]; knowledge?: string[] }> {
		const pick = (i: number[]) => i.map((x) => wfIds[x]).filter(Boolean);
		switch (slug) {
			case 'fronto':
				return [
					{ key: 'angular_component_builder', name: 'Angular component builder', tools: ['connector_repo_search', 'artifact_create_code'], workflowIds: pick([0]) },
					{ key: 'ui_review', name: 'UI review', tools: ['browser_inspect_dom', 'artifact_create_checklist'], workflowIds: pick([1]) },
					{ key: 'accessibility_audit', name: 'Accessibility audit', tools: ['artifact_create_checklist'], workflowIds: pick([2]) },
					{ key: 'responsive_layout_fix', name: 'Responsive layout', tools: ['connector_confluence_search'], workflowIds: pick([3]) },
				];
			case 'testo':
				return [
					{ key: 'regression_test_planner', name: 'Regression planner', tools: ['test_generate_plan', 'connector_jira_search'], workflowIds: pick([1]) },
					{ key: 'playwright_spec_generator', name: 'Playwright spec generator', tools: ['playwright_generate_spec'], workflowIds: pick([2]) },
					{ key: 'browser_smoke_runner', name: 'Browser smoke runner', tools: ['test_run_smoke_mock', 'browser_open_url'], workflowIds: pick([0, 3]) },
					{ key: 'defect_reproduction', name: 'Defect reproduction', tools: ['connector_jira_search', 'connector_repo_search'], workflowIds: pick([1]) },
				];
			case 'backo':
				return [
					{ key: 'api_contract_designer', name: 'API contract designer', tools: ['api_catalog_search'], workflowIds: pick([0]) },
					{ key: 'dto_generator', name: 'DTO generator', tools: ['artifact_create_markdown'], workflowIds: pick([1]) },
					{ key: 'backend_service_reviewer', name: 'Service reviewer', tools: ['connector_jira_search'], workflowIds: pick([2]) },
					{ key: 'schema_helper', name: 'Schema helper', tools: ['db_schema_search'], workflowIds: pick([3]) },
				];
			case 'producto':
				return [
					{ key: 'user_story_generator', name: 'User stories', tools: ['artifact_create_markdown'], workflowIds: pick([0]) },
					{ key: 'acceptance_criteria_builder', name: 'Acceptance criteria', tools: ['artifact_create_markdown'], workflowIds: pick([1]) },
					{ key: 'sprint_scope_planner', name: 'Sprint scope', tools: ['connector_confluence_search'], workflowIds: pick([2]) },
					{ key: 'risk_dependency', name: 'Risks / dependencies', tools: ['artifact_create_markdown'], workflowIds: pick([3]) },
				];
			case 'doco':
				return [
					{ key: 'release_notes_writer', name: 'Release notes', tools: ['connector_confluence_search'], workflowIds: pick([0]) },
					{ key: 'onboarding_doc_writer', name: 'Onboarding docs', tools: ['artifact_create_markdown'], workflowIds: pick([1]) },
					{ key: 'knowledge_article_writer', name: 'Knowledge articles', tools: ['connector_confluence_search'], workflowIds: pick([2]) },
					{ key: 'api_doc_helper', name: 'API documentation', tools: ['api_catalog_search'], workflowIds: pick([3]) },
				];
			case 'dato':
				return [
					{ key: 'sql_report_generator', name: 'SQL reports', tools: ['db_schema_search', 'artifact_create_sql'], workflowIds: pick([0]) },
					{ key: 'dashboard_metric_designer', name: 'Dashboard metrics', tools: ['artifact_create_markdown'], workflowIds: pick([1]) },
					{ key: 'data_quality_checklist', name: 'Data quality', tools: ['connector_jira_search'], workflowIds: pick([2]) },
					{ key: 'report_explainer', name: 'Report explainer', tools: ['artifact_create_markdown'], workflowIds: pick([3]) },
				];
			case 'supporto':
				return [
					{ key: 'ticket_summarizer', name: 'Ticket summarizer', tools: ['connector_jira_search'], workflowIds: pick([1]) },
					{ key: 'customer_reply_writer', name: 'Customer reply', tools: ['connector_support_search', 'artifact_create_email'], workflowIds: pick([0]) },
					{ key: 'escalation_planner', name: 'Escalation planner', tools: ['artifact_create_markdown'], workflowIds: pick([2]) },
					{ key: 'rca_helper', name: 'RCA helper', tools: ['connector_confluence_search'], workflowIds: pick([3]) },
				];
			case 'devopsy':
				return [
					{ key: 'release_checklist_builder', name: 'Release checklist', tools: ['connector_cicd_analyze'], workflowIds: pick([0]) },
					{ key: 'cicd_risk_reviewer', name: 'CI/CD risk', tools: ['connector_repo_pull_requests'], workflowIds: pick([1]) },
					{ key: 'rollback_planner', name: 'Rollback planner', tools: ['artifact_create_markdown'], workflowIds: pick([2]) },
					{ key: 'environment_debugger', name: 'Environment debug', tools: ['connector_repo_search'], workflowIds: pick([3]) },
				];
			default:
				return [];
		}
	}

	private evalCasesFor(slug: string): Array<{
		key: string;
		name: string;
		prompt: string;
		behaviors: string[];
		artifacts: string[];
		tools: string[];
		category: string;
		priority: 'low' | 'medium' | 'high' | 'critical';
	}> {
		const p = (key: string, name: string, prompt: string, behaviors: string[], artifacts: string[], tools: string[], category: string, priority: 'low' | 'medium' | 'high' | 'critical') => ({
			key,
			name,
			prompt,
			behaviors,
			artifacts,
			tools,
			category,
			priority,
		});
		switch (slug) {
			case 'fronto':
				return [
					p('g1', 'Supplier upload card', 'Draft an Angular supplier upload card component with PrimeNG.', ['angular', 'component'], ['code'], ['artifact_create_code'], 'ui', 'high'),
					p('g2', 'A11y review', 'Review this UI for accessibility issues.', ['contrast', 'focus'], ['checklist'], ['artifact_create_checklist'], 'ui', 'high'),
					p('g3', 'Responsive layout', 'Suggest responsive layout fixes for the supplier grid.', ['responsive', 'breakpoint'], ['markdown'], ['connector_repo_search'], 'ui', 'medium'),
					p('g4', 'PrimeNG table', 'Improve PrimeNG table UX for uploads listing.', ['table', 'primeng'], ['markdown'], ['connector_confluence_search'], 'ui', 'medium'),
					p('g5', 'Component checklist', 'Create a checklist before merging the upload feature.', ['checklist'], ['checklist'], ['artifact_create_checklist'], 'ui', 'low'),
				];
			case 'testo':
				return [
					p('g1', 'Login regression plan', 'Create a login regression test plan.', ['regression', 'login'], ['markdown'], ['test_generate_plan'], 'test', 'high'),
					p('g2', 'Playwright supplier upload', 'Generate a Playwright test outline for supplier upload.', ['playwright', 'upload'], ['test'], ['playwright_generate_spec'], 'test', 'high'),
					p('g3', 'Login smoke', 'Run login smoke test plan.', ['smoke', 'login'], ['test'], ['playwright_generate_from_template'], 'test', 'critical'),
					p('g4', 'Defect repro', 'Summarize defect reproduction steps for SUP-1.', ['steps', 'repro'], ['markdown'], ['connector_jira_search'], 'test', 'medium'),
					p('g5', 'Failure analysis', 'Analyze this test failure log and next steps.', ['failure', 'analysis'], ['markdown'], ['test_run_smoke_mock'], 'test', 'medium'),
				];
			case 'backo':
				return [
					p('g1', 'Session API', 'Design agent session REST API boundaries.', ['api', 'session'], ['markdown'], ['api_catalog_search'], 'backend', 'high'),
					p('g2', 'DTOs', 'Propose DTOs for session create/update.', ['dto'], ['markdown'], ['connector_repo_search'], 'backend', 'high'),
					p('g3', 'Service boundaries', 'Review service boundaries for uploads module.', ['service', 'boundary'], ['markdown'], ['connector_jira_search'], 'backend', 'medium'),
					p('g4', 'Schema', 'Suggest database schema changes for upload audit.', ['schema', 'table'], ['sql'], ['db_schema_search'], 'backend', 'medium'),
					p('g5', 'Validation', 'Explain validation errors for upload payload.', ['validation'], ['markdown'], ['api_catalog_search'], 'backend', 'low'),
				];
			case 'producto':
				return [
					p('g1', 'User stories', 'Create user stories from ticket SUP-44.', ['story', 'user'], ['markdown'], ['artifact_create_markdown'], 'product', 'high'),
					p('g2', 'Acceptance criteria', 'Write acceptance criteria for supplier upload.', ['acceptance', 'criteria'], ['markdown'], ['artifact_create_markdown'], 'product', 'high'),
					p('g3', 'Sprint scope', 'Propose sprint scope for upload hardening.', ['sprint', 'scope'], ['markdown'], ['connector_confluence_search'], 'product', 'medium'),
					p('g4', 'Ticket conversion', 'Convert this ticket into requirements bullets.', ['requirements'], ['markdown'], ['connector_jira_search'], 'product', 'medium'),
					p('g5', 'Risks', 'List risks and dependencies for go-live.', ['risk', 'dependency'], ['markdown'], ['artifact_create_markdown'], 'product', 'medium'),
				];
			case 'doco':
				return [
					p('g1', 'Release notes', 'Write release notes for supplier upload v2.', ['release', 'notes'], ['markdown'], ['connector_confluence_search'], 'docs', 'high'),
					p('g2', 'Onboarding', 'Draft onboarding steps for new engineers.', ['onboarding'], ['markdown'], ['artifact_create_markdown'], 'docs', 'medium'),
					p('g3', 'Known issues', 'Document known issues for upload timeouts.', ['known', 'issue'], ['markdown'], ['connector_confluence_search'], 'docs', 'medium'),
					p('g4', 'API documentation', 'Summarize public API for uploads.', ['api', 'documentation'], ['markdown'], ['api_catalog_search'], 'docs', 'medium'),
					p('g5', 'Feature summary', 'Summarize feature behavior for support handoff.', ['feature', 'behavior'], ['markdown'], ['artifact_create_markdown'], 'docs', 'low'),
				];
			case 'dato':
				return [
					p('g1', 'Failed uploads SQL', 'Write SQL to list failed uploads last 7 days.', ['sql', 'failed'], ['sql'], ['artifact_create_sql'], 'data', 'high'),
					p('g2', 'Dashboard metric', 'Define a dashboard metric for upload success rate.', ['metric', 'dashboard'], ['markdown'], ['artifact_create_markdown'], 'data', 'medium'),
					p('g3', 'Data quality', 'Produce a data quality checklist for upload events.', ['quality', 'checklist'], ['markdown'], ['connector_jira_search'], 'data', 'medium'),
					p('g4', 'Report explanation', 'Explain this report output to a PM.', ['explain', 'report'], ['markdown'], ['db_schema_search'], 'data', 'low'),
					p('g5', 'Schema aware query', 'Design a schema-aware query for supplier dimension.', ['schema', 'query'], ['sql'], ['db_schema_search'], 'data', 'medium'),
				];
			case 'supporto':
				return [
					p('g1', 'Ticket summary', 'Summarize ticket 883344 for the team.', ['summary', 'ticket'], ['markdown'], ['connector_support_search'], 'support', 'high'),
					p('g2', 'Customer reply', 'Draft a customer reply about upload errors.', ['reply', 'customer'], ['email'], ['artifact_create_email'], 'support', 'high'),
					p('g3', 'Escalation', 'Plan escalation for recurring upload failures.', ['escalation', 'plan'], ['markdown'], ['artifact_create_markdown'], 'support', 'medium'),
					p('g4', 'Root cause', 'Explain likely root cause for intermittent upload 500.', ['root', 'cause'], ['markdown'], ['connector_jira_search'], 'support', 'medium'),
					p('g5', 'Known issue response', 'Respond referencing known issue DOC-12.', ['known', 'issue'], ['markdown'], ['connector_confluence_search'], 'support', 'low'),
				];
			case 'devopsy':
				return [
					p('g1', 'Release checklist', 'Build a release checklist for tonight’s deploy.', ['release', 'checklist'], ['checklist'], ['connector_cicd_analyze'], 'devops', 'high'),
					p('g2', 'CI/CD risk', 'Review CI/CD risk for the main branch.', ['ci', 'risk'], ['markdown'], ['connector_repo_pull_requests'], 'devops', 'high'),
					p('g3', 'Rollback', 'Draft a rollback plan.', ['rollback', 'plan'], ['markdown'], ['artifact_create_markdown'], 'devops', 'medium'),
					p('g4', 'Environment debug', 'Plan environment debugging steps for staging uploads.', ['environment', 'debug'], ['markdown'], ['connector_repo_search'], 'devops', 'medium'),
					p('g5', 'Deployment readiness', 'Deployment readiness checklist for upload service.', ['readiness', 'deploy'], ['checklist'], ['artifact_create_checklist'], 'devops', 'critical'),
				];
			default:
				return [];
		}
	}
}
