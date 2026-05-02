import { Injectable } from '@angular/core';

import { internalAgentConfig } from '../data/internal-agent-configs';
import type { AgentArtifact, AgentArtifactType } from '../models/agent-artifact.models';
import type { AgentMode } from '../models/agent-chat.models';
import type {
	AgentRun,
	AgentRunStatus,
	AgentRuntimeEvent,
	AgentRuntimeEventType,
	AgentStepStatus,
	AgentToolCall,
	AgentToolCallStatus,
	AgentApprovalRequest,
	AgentRunStep,
} from '../models/agent-runtime.models';
import type {
	AgentBrowserState,
	AgentChatMessage,
	AgentSession,
	AgentTestResult,
} from '../models/agent-session.models';
import type { AgentWorkspaceMode } from '../models/agent-session.models';
import { stripSimpleMarkdown } from '../utils/agent-text.util';

function rid(p: string): string {
	const r =
		typeof crypto !== 'undefined' && 'randomUUID' in crypto
			? crypto.randomUUID()
			: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
	return `${p}-${r}`;
}

function nowIso(): string {
	return new Date().toISOString();
}

export interface MockConsoleLine {
	readonly level: 'info' | 'warning' | 'error' | 'success';
	readonly message: string;
	readonly source: 'agent' | 'browser' | 'tool' | 'system';
}

export interface MockMessageResult {
	readonly run: AgentRun;
	readonly message: AgentChatMessage;
	readonly artifacts: AgentArtifact[];
	readonly events: AgentRuntimeEvent[];
	readonly testResults: AgentTestResult[] | null;
	readonly browserPatch: Partial<AgentBrowserState> | null;
	readonly consoleLines: MockConsoleLine[];
	readonly suggestedChips: string[];
}

@Injectable({ providedIn: 'root' })
export class MockAgentBackendService {
	createMockSession(agentSlug: string, mode: AgentWorkspaceMode = 'ask'): AgentSession {
		const t = nowIso();
		return {
			id: rid('sess'),
			agentSlug,
			title: 'New session',
			mode,
			status: 'idle',
			createdAt: t,
			updatedAt: t,
			messageCount: 0,
			preview: 'Empty session',
		};
	}

	listMockSessions(agentSlug: string): AgentSession[] {
		const titles = this.seedTitles(agentSlug);
		return titles.map((title, i) => ({
			id: `mock-seed-${agentSlug}-${i}`,
			agentSlug,
			title,
			mode: 'ask' as const,
			status: (i === 0 ? 'active' : 'idle') as AgentSession['status'],
			createdAt: new Date(Date.now() - (i + 1) * 86_400_000).toISOString(),
			updatedAt: new Date(Date.now() - i * 3600_000).toISOString(),
			messageCount: 0,
			preview: i === 0 ? 'Ready when you are.' : `Earlier: ${title.slice(0, 42)}…`,
		}));
	}

	generateMockTestResults(agentSlug: string, message: string): AgentTestResult[] | null {
		const m = message.toLowerCase();
		if (agentSlug !== 'testo' && !/\b(test|playwright|regression|smoke)\b/i.test(m)) {
			return null;
		}
		return [
			{ id: rid('tr'), title: 'login.spec.ts — form renders', status: 'passed', durationMs: 420 },
			{ id: rid('tr'), title: 'dashboard.spec.ts — nav smoke', status: 'passed', durationMs: 890 },
			{
				id: rid('tr'),
				title: 'upload.spec.ts — supplier CSV',
				status: 'failed',
				durationMs: 1200,
				error: 'Timeout: [data-testid="upload-confirm"]',
			},
			{ id: rid('tr'), title: 'auth.setup.ts', status: 'skipped' },
		];
	}

	generateMockBrowserState(
		agentSlug: string,
		message: string,
	): Partial<AgentBrowserState> | null {
		if (!/\b(browser|playwright|open app|localhost)\b/i.test(message)) {
			return null;
		}
		return {
			isOpen: true,
			currentUrl: 'http://localhost:4200',
			title: 'Bluemeteor AI Force (local)',
			loading: false,
		};
	}

	createMockRun(
		sessionId: string,
		agentSlug: string,
		mode: AgentWorkspaceMode,
		userMessage: string,
	): MockMessageResult {
		const cfg = internalAgentConfig(agentSlug);
		const runId = rid('run');
		const t0 = nowIso();
		const steps = this.generateMockSteps(runId, agentSlug, userMessage);
		const toolCalls = this.generateMockToolCalls(runId, agentSlug, userMessage);
		const approvals = this.generateMockApprovals(runId, agentSlug, userMessage, cfg);
		const status: AgentRunStatus =
			approvals.some((a) => a.status === 'pending') ? 'waiting_for_approval' : 'completed';
		const finalAnswer = stripSimpleMarkdown(
			this.generateMockAgentReply(agentSlug, mode as AgentMode, userMessage),
		);

		const run: AgentRun = {
			id: runId,
			sessionId,
			agentSlug,
			mode,
			status,
			userMessage,
			finalAnswer,
			steps,
			toolCalls,
			approvals,
			createdAt: t0,
			updatedAt: nowIso(),
			completedAt: status === 'completed' ? nowIso() : undefined,
		};

		const artifacts = this.generateMockArtifacts(sessionId, runId, agentSlug, userMessage);
		const events = this.generateMockEvents(
			sessionId,
			runId,
			agentSlug,
			userMessage,
			steps,
			toolCalls,
			artifacts,
			approvals,
			status,
		);

		const msg: AgentChatMessage = {
			id: rid('chat'),
			sessionId,
			role: 'agent',
			content: finalAnswer,
			createdAt: nowIso(),
			status: 'done',
			metadata: { runId },
		};

		const testResults = this.generateMockTestResults(agentSlug, userMessage);
		const browserPatch = this.generateMockBrowserState(agentSlug, userMessage);

		const consoleLines: MockConsoleLine[] = [
			{ level: 'info', message: 'Run accepted by mock orchestrator', source: 'system' },
			{ level: 'info', message: `Run ${runId} — ${status}`, source: 'agent' },
		];
		if (browserPatch) {
			consoleLines.push({ level: 'info', message: 'Browser preview requested', source: 'browser' });
		}
		if (testResults) {
			consoleLines.push({ level: 'success', message: 'Mock test results attached', source: 'tool' });
		}

		return {
			run,
			message: msg,
			artifacts,
			events,
			testResults,
			browserPatch,
			consoleLines,
			suggestedChips: this.suggestedChips(mode as AgentMode, agentSlug),
		};
	}

	generateMockAgentReply(agentSlug: string, mode: AgentMode, message: string): string {
		const cfg = internalAgentConfig(agentSlug);
		const intro = cfg
			? `I'm ${cfg.displayName} (${cfg.role}). `
			: `I'm your ${agentSlug} agent. `;
		const body = this.scenarioReply(agentSlug, mode, message);
		const modeLine =
			mode === 'ask'
				? 'Mode: Ask — exploring options and tradeoffs.\n\n'
				: mode === 'plan'
					? 'Mode: Plan — structured milestones and verification.\n\n'
					: 'Mode: Act — concrete drafts you can hand to the team.\n\n';
		return intro + modeLine + body;
	}

	private scenarioReply(slug: string, mode: AgentMode, raw: string): string {
		const m = raw.toLowerCase();
		const snippets: Record<string, string> = {
			fronto_review:
				'### UI review\n- Increase tap targets on dense tables (min 40px).\n- Ensure focus rings meet WCAG 2.2 contrast for keyboard users.\n- Prefer responsive grid over fixed widths for the supplier card.\n\nNext: I can draft an Angular host + presentational split for the upload card.',
			fronto_component:
				'### Supplier upload card (sketch)\n- Use a `p-card` wrapper + drag-drop zone.\n- Emit `filesSelected` and validate MIME before upload.\n- Surface quota errors inline with `p-message`.\n\nI added a TypeScript + HTML artifact you can paste into a sandbox route.',
			fronto_responsive:
				'### Responsive fixes\n- Replace fixed `w-[480px]` with `max-w-full sm:max-w-lg`.\n- Move secondary actions to a `p-splitbutton` on narrow screens.\n- Verify overflow-x on data tables inside flex layouts.',
			testo_browser:
				'### Regression plan — login\n1. Happy path: valid creds → dashboard.\n2. Lockout messaging: invalid N times.\n3. Session persistence across refresh.\n\nBrowser workspace shows localhost mock; Playwright specs drafted as artifacts.',
			testo_playwright:
				'### Playwright outline\n- `test.beforeEach` seeds auth storage.\n- Tests use `getByRole` and `data-testid` for stability.\n- Tag `@smoke` for CI fast path.\n',
			producto_stories:
				'### User stories\n1. As an operator, I can resume an agent session after refresh so I don’t lose context.\n2. As a reviewer, I can approve risky tool calls before execution.\n3. As QA, I can see test artifacts tied to a run id.',
			producto_ac:
				'### Acceptance criteria (browser testing)\n- Given a session with browser enabled, when the agent navigates, then the workspace records a browser event.\n- Given approvals are enabled, when a critical tool triggers, then the run blocks until approved.',
			backo_api:
				'### Sessions API (sketch)\n- `POST /agents/:slug/sessions` → `{ id, title }`\n- `POST /agents/sessions/:id/messages` → starts a run, returns run id + stream token.\n- All artifacts reference `runId` + `sessionId` for traceability.',
			backo_dto:
				'### DTOs\n- `AgentRunDto`: id, sessionId, status, steps[], toolCalls[], approvals[].\n- `AgentArtifactDto`: type enum extended with language + metadata JSON.',
			doco_release:
				'### Release notes (draft)\n- Added agent runtime client abstraction (`AgentApiService`).\n- Mock backend centralizes demo scenarios.\n- Session persistence (localStorage) when mock mode is on.',
			doco_onboard:
				'### Onboarding\n1. Clone repo and `npm i`.\n2. `npm start` — mock agents enabled by default.\n3. Open `/agent-readiness` to verify internal agent configs.',
			dato_sql:
				'### SQL — failed uploads (illustrative)\n```sql\nSELECT DATE_TRUNC(\'day\', failed_at) AS day, COUNT(*) AS fails\nFROM supplier_uploads WHERE status = \'failed\'\nGROUP BY 1 ORDER BY 1 DESC LIMIT 30;\n```\n',
			dato_metrics:
				'### Usage metrics\n- Active sessions / day by agent slug.\n- Run completion vs waiting_for_approval ratio.\n- Artifact counts by type.',
			supporto_ticket:
				'### Ticket summary\n- Symptom: intermittent timeout after upload.\n- Likely causes: network blip vs server 504 — check correlation ID in logs.\n- Suggested priority: P3 unless revenue-impacted.',
			supporto_reply:
				'### Draft reply\nHi [Name], thanks for your patience. We’re investigating timeouts during upload. Could you share approximate time (UTC) and file size? We’ll follow up within [SLA].\n— Supporto',
			devopsy_release:
				'### Release checklist\n- [ ] Green CI on `main`\n- [ ] Staging smoke passed\n- [ ] Feature flags verified\n- [ ] Rollback script rehearsed\n- [ ] Comms scheduled',
			devopsy_ci:
				'### CI/CD risks\n- Flaky E2E: pin Playwright version; shard tests.\n- Long npm install: cache key on lockfile only.\n- Secrets: verify OIDC scopes before prod promotion.',
		};

		if (slug === 'fronto') {
			if (m.includes('review') && m.includes('ui')) return snippets['fronto_review'];
			if (m.includes('component') || m.includes('supplier')) return snippets['fronto_component'];
			if (m.includes('responsive') || m.includes('layout')) return snippets['fronto_responsive'];
		}
		if (slug === 'testo') {
			if (m.includes('browser') || m.includes('login')) return snippets['testo_browser'];
			if (m.includes('playwright') || m.includes('regression')) return snippets['testo_playwright'];
		}
		if (slug === 'producto') {
			if (m.includes('stor')) return snippets['producto_stories'];
			if (m.includes('acceptance') || m.includes('criteria')) return snippets['producto_ac'];
		}
		if (slug === 'backo') {
			if (m.includes('api') || m.includes('contract')) return snippets['backo_api'];
			if (m.includes('dto')) return snippets['backo_dto'];
		}
		if (slug === 'doco') {
			if (m.includes('release')) return snippets['doco_release'];
			if (m.includes('onboard')) return snippets['doco_onboard'];
		}
		if (slug === 'dato') {
			if (m.includes('sql')) return snippets['dato_sql'];
			if (m.includes('metric') || m.includes('dashboard')) return snippets['dato_metrics'];
		}
		if (slug === 'supporto') {
			if (m.includes('summarize') || m.includes('issue')) return snippets['supporto_ticket'];
			if (m.includes('reply') || m.includes('customer')) return snippets['supporto_reply'];
		}
		if (slug === 'devopsy') {
			if (m.includes('checklist') || m.includes('release')) return snippets['devopsy_release'];
			if (m.includes('ci') || m.includes('pipeline') || m.includes('cicd'))
				return snippets['devopsy_ci'];
		}

		return (
			`### Response\nI processed your request in **${mode}** mode.\n\n` +
			`Key points:\n- Align with internal safety defaults (approvals for risky tools).\n- Use run IDs to correlate messages, artifacts, and tests.\n- Next hook: connect \`AgentApiService\` to NestJS orchestrator when ready.\n`
		);
	}

	private suggestedChips(mode: AgentMode, slug: string): string[] {
		const generic = [
			'List verification steps',
			'Draft stakeholder update (5 bullets)',
			'Summarize risks for rollout',
		];
		const plan = ['Turn this into milestones', 'Add RACI', 'Define rollback triggers'];
		const act = ['Produce runnable checklist', 'Draft SQL sketch', 'Generate QA gates'];
		const slugChips: Record<string, string[]> = {
			fronto: ['Tighten a11y on tables', 'Split smart vs dumb components'],
			testo: ['Tag tests @smoke', 'Add data-testid map'],
			backo: ['OpenAPI fragment', 'DTO validation rules'],
		};
		const extra = slugChips[slug] ?? [];
		if (mode === 'plan') return [...plan, ...extra].slice(0, 5);
		if (mode === 'act') return [...act, ...extra].slice(0, 5);
		return [...generic, ...extra].slice(0, 5);
	}

	private seedTitles(slug: string): [string, string, string] {
		switch (slug) {
			case 'fronto':
				return [
					'Fix dashboard layout issue',
					'Generate reusable Angular table',
					'Review accessibility issues',
				];
			case 'testo':
				return [
					'Regression test for supplier upload',
					'Create Playwright smoke suite',
					'Validate login and dashboard flow',
				];
			case 'producto':
				return [
					'Write user stories for agent workspace',
					'Prepare acceptance criteria',
					'Summarize sprint scope',
				];
			default:
				return [
					`${slug}: Discovery session`,
					`${slug}: Implementation notes`,
					`${slug}: Review & sign-off`,
				];
		}
	}

	private generateMockSteps(
		runId: string,
		agentSlug: string,
		message: string,
	): AgentRunStep[] {
		const mk = (
			title: string,
			desc: string,
			status: AgentStepStatus,
		): AgentRunStep => ({
			id: rid('step'),
			runId,
			title,
			description: desc,
			status,
			startedAt: nowIso(),
			completedAt: status === 'running' ? undefined : nowIso(),
		});
		return [
			mk('Ingest request', 'Normalize intent and internal constraints', 'completed'),
			mk(
				'Plan tool usage',
				`Select tools allowed for ${agentSlug}`,
				'completed',
			),
			mk(
				'Synthesize answer',
				'Produce reply + optional artifacts',
				/\b(approval|migrate|deploy|sql exec)\b/i.test(message) ? 'completed' : 'completed',
			),
		];
	}

	generateMockToolCalls(runId: string, agentSlug: string, message: string): AgentToolCall[] {
		const m = message.toLowerCase();
		const mk = (
			name: string,
			desc: string,
			status: AgentToolCallStatus,
		): AgentToolCall => ({
			id: rid('tool'),
			runId,
			name,
			description: desc,
			status,
			startedAt: nowIso(),
			completedAt: status === 'running' ? undefined : nowIso(),
			input: { query: message.slice(0, 200) },
		});
		const calls: AgentToolCall[] = [mk('context.pack', 'Attach workspace context', 'completed')];
		if (/\b(browser|localhost|playwright)\b/i.test(message)) {
			calls.push(mk('browser.preview', 'Open mock browser target', 'completed'));
		}
		if (agentSlug === 'testo' && /\b(test|playwright)\b/i.test(m)) {
			calls.push(mk('playwright.plan', 'Author test steps', 'completed'));
		}
		if (/\b(sql|query|report)\b/i.test(m)) {
			calls.push(mk('sql.draft', 'Draft read-only SQL', 'completed'));
		}
		return calls;
	}

	generateMockApprovals(
		runId: string,
		agentSlug: string,
		message: string,
		cfg: ReturnType<typeof internalAgentConfig>,
	): AgentApprovalRequest[] {
		const approvals: AgentApprovalRequest[] = [];
		const m = message.toLowerCase();
		if (!cfg) return approvals;

		if (
			agentSlug === 'backo' &&
			/\b(migration|migrate|ddl|schema change)\b/i.test(message)
		) {
			approvals.push({
				id: rid('appr'),
				runId,
				title: 'Database migration proposal',
				description: 'Review DDL impact before sharing with DBA.',
				riskLevel: 'critical',
				actionType: 'migration.plan',
				payload: { tables: ['supplier_uploads'], operation: 'ALTER' },
				status: 'pending',
				createdAt: nowIso(),
			});
		}
		if (agentSlug === 'dato' && /\b(run|execute)\b.*\b(sql|query)\b/i.test(message)) {
			approvals.push({
				id: rid('appr'),
				runId,
				title: 'Execute analytical SQL',
				description: 'Execution against warehouses requires approval.',
				riskLevel: 'high',
				actionType: 'sql.draft',
				payload: { warehouse: 'analytics', readOnly: true },
				status: 'pending',
				createdAt: nowIso(),
			});
		}
		if (agentSlug === 'devopsy' && /\b(deploy|promote|production)\b/i.test(m)) {
			approvals.push({
				id: rid('appr'),
				runId,
				title: 'Production promotion',
				description: 'Verify blast radius and rollback path.',
				riskLevel: 'critical',
				actionType: 'deploy.request',
				payload: { environment: 'production' },
				status: 'pending',
				createdAt: nowIso(),
			});
		}
		return approvals;
	}

	generateMockArtifacts(
		sessionId: string,
		runId: string,
		agentSlug: string,
		message: string,
	): AgentArtifact[] {
		const m = message.toLowerCase();
		const t = nowIso();
		const base = (
			title: string,
			type: AgentArtifactType,
			content: string,
			language?: string,
		): AgentArtifact => ({
			id: rid('art'),
			sessionId,
			runId,
			agentSlug,
			type,
			title,
			content,
			language,
			createdAt: t,
			metadata: { mock: true },
		});

		const out: AgentArtifact[] = [];

		if (agentSlug === 'fronto' && /\b(component|angular|supplier)\b/i.test(m)) {
			out.push(
				base(
					'Supplier upload card (draft)',
					'typescript',
					`@Component({\n  selector: 'app-supplier-upload-card',\n  standalone: true,\n  imports: [CommonModule, CardModule, FileUploadModule],\n  templateUrl: './supplier-upload-card.component.html',\n})\nexport class SupplierUploadCardComponent {\n  @Output() filesSelected = new EventEmitter<File[]>();\n}\n`,
					'typescript',
				),
			);
		}
		if (agentSlug === 'backo' && /\b(api|dto|contract)\b/i.test(m)) {
			out.push(
				base(
					'AgentRunDto (sketch)',
					'json',
					JSON.stringify(
						{
							id: '<uuid>',
							sessionId: '<uuid>',
							status: 'completed',
							steps: [],
							toolCalls: [],
						},
						null,
						2,
					),
					'json',
				),
			);
		}
		if (agentSlug === 'testo' && /\b(playwright|test)\b/i.test(m)) {
			out.push(
				base(
					'login.spec.ts (fragment)',
					'test',
					`import { test, expect } from '@playwright/test';\n\ntest('login happy path', async ({ page }) => {\n  await page.goto('/login');\n  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();\n});\n`,
					'test',
				),
			);
		}
		if (agentSlug === 'producto' || /\b(user stor|acceptance)\b/i.test(m)) {
			out.push(
				base(
					'Backlog slice',
					'markdown',
					'## Story\nAs a user, I want sessions to persist across refresh.\n\n## AC\n- Given mock persistence on, when I reload, then sessions restore.\n',
				),
			);
		}
		if (agentSlug === 'doco' || /\brelease|onboard/i.test(m)) {
			out.push(
				base(
					'Internal release notes',
					'document',
					'# Agent runtime client\n- Mock backend extraction\n- Orchestrator wiring\n',
				),
			);
		}
		if (agentSlug === 'dato' || /\bsql|report/i.test(m)) {
			out.push(
				base(
					'Reporting query',
					'sql',
					"SELECT agent_slug, COUNT(*) FROM agent_sessions GROUP BY 1 ORDER BY 2 DESC;",
					'sql',
				),
			);
		}
		if (agentSlug === 'supporto' || /\bticket|reply|customer/i.test(m)) {
			out.push(
				base(
					'Customer reply draft',
					'email',
					'Subject: Follow-up on upload timeout\n\nHello — we are investigating…\n',
				),
			);
		}
		if (agentSlug === 'devopsy' || /\byaml|ci|pipeline|checklist/i.test(m)) {
			out.push(
				base(
					'release-checklist.yaml',
					'yaml',
					'checks:\n  - name: ci-green\n    type: github-status\n',
					'yaml',
				),
			);
		}

		if (out.length === 0) {
			out.push(
				base(
					'Run summary',
					'markdown',
					`# Summary\nSession \`${sessionId}\` — run \`${runId}\`.\n`,
				),
			);
		}
		return out;
	}

	generateMockEvents(
		sessionId: string,
		runId: string,
		agentSlug: string,
		message: string,
		steps: AgentRunStep[],
		toolCalls: AgentToolCall[],
		artifacts: AgentArtifact[],
		approvals: AgentApprovalRequest[],
		runStatus: AgentRunStatus,
	): AgentRuntimeEvent[] {
		const ev = (
			type: AgentRuntimeEventType,
			title: string,
			msg?: string,
			payload?: Record<string, unknown>,
		): AgentRuntimeEvent => ({
			id: rid('evt'),
			runId,
			sessionId,
			agentSlug,
			type,
			title,
			message: msg,
			timestamp: nowIso(),
			payload,
		});

		const events: AgentRuntimeEvent[] = [
			ev('run_started', 'Run started', `Run ${runId}`),
		];
		for (const s of steps) {
			events.push(
				ev('step_started', `Step: ${s.title}`, s.description, { stepId: s.id }),
			);
			events.push(ev('step_completed', `Step done: ${s.title}`, undefined, { stepId: s.id }));
		}
		for (const tc of toolCalls) {
			events.push(
				ev('tool_call_started', `Tool: ${tc.name}`, tc.description, {
					toolCallId: tc.id,
				}),
			);
			events.push(
				ev('tool_call_completed', `Tool done: ${tc.name}`, undefined, {
					toolCallId: tc.id,
				}),
			);
		}
		for (const a of artifacts) {
			events.push(
				ev('artifact_created', `Artifact: ${a.title}`, a.type, {
					artifactId: a.id,
				}),
			);
		}
		for (const ap of approvals) {
			events.push(
				ev('approval_required', ap.title, ap.description, {
					approvalId: ap.id,
					risk: ap.riskLevel,
				}),
			);
		}
		if (/\b(browser|localhost)\b/i.test(message)) {
			events.push(ev('browser_opened', 'Browser workspace', 'http://localhost:4200'));
			events.push(
				ev('browser_navigated', 'Navigated (mock)', undefined, { url: 'http://localhost:4200' }),
			);
		}
		if (agentSlug === 'testo' && /\b(test|playwright)\b/i.test(message.toLowerCase())) {
			events.push(ev('test_run_started', 'Mock tests queued'));
			events.push(ev('test_run_completed', 'Mock tests finished'));
		}
		if (runStatus === 'completed') {
			events.push(ev('run_completed', 'Run completed', undefined, { status: runStatus }));
		} else if (runStatus === 'failed') {
			events.push(ev('run_failed', 'Run failed', undefined, { status: runStatus }));
		} else if (runStatus === 'waiting_for_approval') {
			events.push(
				ev('run_completed', 'Run paused for approval', undefined, { status: runStatus }),
			);
		}
		events.push(ev('message_created', 'Assistant message materialized'));
		return events;
	}
}
