import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import { isoNow } from '../../common/utils/dates';
import { newId } from '../../common/utils/ids';
import { AgentApprovalService } from '../../agents/services/agent-approval.service';
import { AgentArtifactService } from '../../agents/services/agent-artifact.service';
import { AgentAuditLogService } from '../../agents/services/agent-audit-log.service';
import { AgentEventBusService } from '../../agents/services/agent-event-bus.service';
import { AgentRunService } from '../../agents/services/agent-run.service';
import { BrowserAuthCaptureService } from '../../browser/services/browser-auth-capture.service';
import { BrowserProfileService } from '../../browser/services/browser-profile.service';
import { BrowserSessionService } from '../../browser/services/browser-session.service';
import { BrowserWorkerService } from '../../browser/services/browser-worker.service';
import { PlaywrightTestRunnerService } from '../../testing/services/playwright-test-runner.service';
import { TestRunnerService } from '../../testing/services/test-runner.service';
import type { ToolExecutionRequest, ToolExecutionResult } from '../models/tool-execution.model';
import type { ToolExecutionStatus } from '../models/tool-execution.model';
import { RbacService } from '../../auth/services/rbac.service';
import { ConnectorHubService } from '../../connectors/services/connector-hub.service';
import { ConnectorCallRepository } from '../../connectors/repositories/connector-call.repository';
import { ConnectorRegistryService } from '../../connectors/services/connector-registry.service';
import { InternalToolHubService } from '../../internal-tools/services/internal-tool-hub.service';
import { McpAdapterService } from '../../internal-tools/services/mcp-adapter.service';
import { ToolExecutionRepository } from '../repositories/tool-execution.repository';
import { ToolPermissionService } from './tool-permission.service';
import { ToolRegistryService } from './tool-registry.service';

export interface ExecuteToolOptions {
	readonly forceApproved?: boolean;
	readonly existingExecutionId?: string;
}

@Injectable()
export class ToolExecutorService {
	private readonly log = new Logger(ToolExecutorService.name);

	constructor(
		private readonly appConfig: AppConfigService,
		private readonly registry: ToolRegistryService,
		private readonly perm: ToolPermissionService,
		private readonly repo: ToolExecutionRepository,
		@Inject(forwardRef(() => AgentApprovalService)) private readonly approvals: AgentApprovalService,
		@Inject(forwardRef(() => AgentEventBusService)) private readonly events: AgentEventBusService,
		@Inject(forwardRef(() => AgentArtifactService)) private readonly artifacts: AgentArtifactService,
		@Inject(forwardRef(() => AgentAuditLogService)) private readonly audit: AgentAuditLogService,
		@Inject(forwardRef(() => AgentRunService)) private readonly runs: AgentRunService,
		private readonly browserSessions: BrowserSessionService,
		private readonly browserWorker: BrowserWorkerService,
		private readonly browserProfiles: BrowserProfileService,
		private readonly browserAuthCapture: BrowserAuthCaptureService,
		private readonly playwrightRunner: PlaywrightTestRunnerService,
		private readonly tests: TestRunnerService,
		private readonly rbac: RbacService,
		private readonly internalHub: InternalToolHubService,
		private readonly mcpAdapter: McpAdapterService,
		private readonly connectorHub: ConnectorHubService,
		private readonly connectorRegistry: ConnectorRegistryService,
		private readonly connectorCalls: ConnectorCallRepository,
	) {}

	/** Legacy mock helper used by older orchestrator paths. */
	executeMockTool(runId: string, agentSlug: string, toolId: string, input?: Record<string, unknown>): {
		id: string;
		runId: string;
		toolId: string;
		status: 'completed';
		input?: Record<string, unknown>;
		output: Record<string, unknown>;
		startedAt: string;
		completedAt: string;
	} {
		const now = isoNow();
		return {
			id: newId('tex'),
			runId,
			toolId,
			status: 'completed',
			input,
			output: {
				mock: true,
				agentSlug,
				message: `Mock output for ${toolId}`,
			},
			startedAt: now,
			completedAt: now,
		};
	}

	private async emit(
		sessionId: string,
		runId: string,
		agentSlug: string,
		type: import('../../agents/models/agent-runtime-event.model').AgentRuntimeEventType,
		title: string,
		payload?: Record<string, unknown>,
		message?: string,
	): Promise<void> {
		await this.events.emit({
			id: newId('evt'),
			runId,
			sessionId,
			agentSlug,
			type,
			title,
			message,
			timestamp: isoNow(),
			payload,
		});
	}

	async execute(req: ToolExecutionRequest, opts?: ExecuteToolOptions): Promise<ToolExecutionResult> {
		const def = this.registry.getTool(req.toolId);
		const authUser =
			req.actorUserId !== undefined ? (await this.rbac.loadAuthUser(req.actorUserId)) ?? undefined : undefined;
		const decision = this.perm.decide(req.agentSlug, req.toolId, req.mode, authUser ?? null);

		const validation = this.perm.validateToolInput(req.toolId, req.input);
		if (!validation.ok) {
			return this.finishBlocked(req, opts?.existingExecutionId, validation.reason ?? 'invalid_input');
		}

		let execId = opts?.existingExecutionId ?? newId('texec');
		const risk = decision.riskLevel ?? def?.riskLevel ?? 'low';

		if (!opts?.existingExecutionId) {
			await this.repo.create({
				id: execId,
				runId: req.runId,
				sessionId: req.sessionId,
				agentSlug: req.agentSlug,
				toolId: req.toolId,
				status: 'queued',
				riskLevel: risk,
				input: { ...req.input },
				createdAt: new Date(),
			});
		}

		if (!decision.allowed) {
			await this.repo.update(execId, { status: 'blocked', error: decision.reason, completedAt: new Date() });
			await this.emit(req.sessionId, req.runId, req.agentSlug, 'tool_blocked', req.toolId, {
				reason: decision.reason,
				missingPermissions: decision.missingPermissions,
			});
			await this.emit(req.sessionId, req.runId, req.agentSlug, 'tool_call_failed', req.toolId, {
				reason: decision.reason,
			});
			await this.auditLog(req, 'permission_denied', {
				toolId: req.toolId,
				reason: decision.reason,
				missingPermissions: decision.missingPermissions,
			});
			return { executionId: execId, status: 'blocked', error: decision.reason };
		}

		const needsApproval = decision.requiresApproval && !opts?.forceApproved && this.appConfig.enableApprovalGates;
		if (needsApproval) {
			const appr = await this.approvals.createApproval(
				req.runId,
				{
					title: `Approve tool: ${req.toolId}`,
					description: def?.description ?? 'Tool execution requires approval.',
					riskLevel: risk === 'critical' ? 'critical' : risk === 'high' ? 'high' : 'medium',
					actionType: req.toolId,
					payload: { toolExecutionId: execId, toolId: req.toolId },
				},
				req.actorUserId,
			);
			await this.repo.update(execId, {
				status: 'requires_approval',
				approvalId: appr.id,
				completedAt: null,
			});
			await this.runs.updateRun(req.runId, { status: 'waiting_for_approval', updatedAt: isoNow() });
			await this.emit(req.sessionId, req.runId, req.agentSlug, 'approval_required', appr.title, {
				approvalId: appr.id,
				toolExecutionId: execId,
			});
			await this.emit(req.sessionId, req.runId, req.agentSlug, 'tool_execution_waiting_for_approval', req.toolId, {
				approvalId: appr.id,
				executionId: execId,
			});
			return { executionId: execId, status: 'requires_approval', approvalId: appr.id };
		}

		await this.repo.update(execId, { status: 'running', startedAt: new Date() });
		await this.emit(req.sessionId, req.runId, req.agentSlug, 'tool_call_started', req.toolId, { executionId: execId });

		try {
			const out = await this.dispatch(req, opts?.forceApproved ?? false);
			await this.repo.update(execId, {
				status: 'completed',
				output: out.output ?? {},
				completedAt: new Date(),
			});
			await this.emit(req.sessionId, req.runId, req.agentSlug, 'tool_call_completed', req.toolId, {
				executionId: execId,
			});
			await this.auditLog(req, 'tool_completed', { toolId: req.toolId });
			return {
				executionId: execId,
				status: 'completed',
				output: out.output,
				artifactIds: out.artifactIds,
			};
		} catch (e) {
			const err = e instanceof Error ? e.message : String(e);
			this.log.warn(`Tool ${req.toolId} failed: ${err}`);
			await this.repo.update(execId, { status: 'failed', error: err, completedAt: new Date() });
			await this.emit(req.sessionId, req.runId, req.agentSlug, 'tool_call_failed', req.toolId, { error: err });
			return { executionId: execId, status: 'failed', error: err };
		}
	}

	private async finishBlocked(req: ToolExecutionRequest, existingId: string | undefined, reason: string): Promise<ToolExecutionResult> {
		const id = existingId ?? newId('texec');
		if (!existingId) {
			await this.repo.create({
				id,
				runId: req.runId,
				sessionId: req.sessionId,
				agentSlug: req.agentSlug,
				toolId: req.toolId,
				status: 'blocked',
				riskLevel: 'low',
				input: req.input,
				createdAt: new Date(),
			});
		}
		await this.repo.update(id, { status: 'blocked', error: reason, completedAt: new Date() });
		await this.emit(req.sessionId, req.runId, req.agentSlug, 'tool_blocked', req.toolId, { reason });
		await this.emit(req.sessionId, req.runId, req.agentSlug, 'tool_call_failed', req.toolId, { reason });
		return { executionId: id, status: 'blocked', error: reason };
	}

	private async dispatch(
		req: ToolExecutionRequest,
		forceApproved: boolean,
	): Promise<{ output: Record<string, unknown>; artifactIds?: string[] }> {
		const id = req.toolId;
		if (id.startsWith('playwright_')) return this.runPlaywright(req, forceApproved);
		if (id.startsWith('browser_')) return this.runBrowser(req, forceApproved);
		if (id.startsWith('test_')) return this.runTesting(req);
		if (id.startsWith('artifact_')) return this.runArtifact(req);
		if (id.startsWith('mcp_')) return this.runMcp(req);
		if (id.startsWith('connector_')) return this.runConnector(req);
		if (this.isInternalReadTool(id)) return this.runInternalRead(req);
		return this.runLegacyMock(req);
	}

	private isInternalReadTool(id: string): boolean {
		return (
			id.startsWith('repository_') ||
			id.startsWith('docs_') ||
			id.startsWith('tickets_') ||
			id.startsWith('api_catalog_') ||
			id.startsWith('db_schema_') ||
			id.startsWith('cicd_')
		);
	}

	private async runMcp(req: ToolExecutionRequest): Promise<{ output: Record<string, unknown> }> {
		const sid = typeof req.input['serverId'] === 'string' ? req.input['serverId'] : '';
		if (req.toolId === 'mcp_start_server' && sid) {
			await this.emit(req.sessionId, req.runId, req.agentSlug, 'mcp_server_started', `MCP start ${sid}`, {
				serverId: sid,
			});
		}
		if (req.toolId === 'mcp_stop_server' && sid) {
			await this.emit(req.sessionId, req.runId, req.agentSlug, 'mcp_server_stopped', `MCP stop ${sid}`, {
				serverId: sid,
			});
		}
		if (req.toolId === 'mcp_discover_tools' && sid) {
			await this.emit(req.sessionId, req.runId, req.agentSlug, 'mcp_tools_discovered', `MCP discover ${sid}`, {
				serverId: sid,
			});
		}
		const out = await this.mcpAdapter.executeRegistryTool(req.toolId, req.input ?? {}, {
			runId: req.runId,
			sessionId: req.sessionId,
			agentSlug: req.agentSlug,
		});
		const meta = out['metadata'];
		const blocked =
			meta &&
			typeof meta === 'object' &&
			((meta as Record<string, unknown>)['blocked'] === true ||
				(meta as Record<string, unknown>)['code'] === 'mcp_tool_blocked_policy');
		if (req.toolId === 'mcp_call_tool' && blocked) {
			await this.emit(req.sessionId, req.runId, req.agentSlug, 'mcp_tool_blocked', req.toolId, {
				serverId: req.input['serverId'],
				toolName: req.input['toolName'],
			});
		} else if (req.toolId === 'mcp_call_tool') {
			await this.emit(req.sessionId, req.runId, req.agentSlug, 'mcp_tool_called', req.toolId, {
				serverId: req.input['serverId'],
				toolName: req.input['toolName'],
			});
		}
		return { output: out };
	}

	private async runInternalRead(req: ToolExecutionRequest): Promise<{ output: Record<string, unknown> }> {
		const out = await this.internalHub.executeReadOnlyTool(req.toolId, req.input ?? {});
		return { output: out };
	}

	private connectorFallbackLikely(toolId: string): boolean {
		if (toolId.startsWith('connector_repo')) {
			const bb =
				this.appConfig.enableBitbucketConnector &&
				!!this.appConfig.bitbucketWorkspace &&
				!!this.appConfig.bitbucketUsername &&
				!!this.appConfig.bitbucketAppPassword;
			const gh = this.appConfig.enableGithubConnector && !!this.appConfig.githubToken;
			return !bb && !gh && this.appConfig.enableConnectorMockFallback;
		}
		if (toolId.startsWith('connector_jira')) {
			const ok =
				this.appConfig.enableJiraConnector &&
				!!this.appConfig.jiraBaseUrl &&
				!!this.appConfig.jiraEmail &&
				!!this.appConfig.jiraApiToken;
			return !ok && this.appConfig.enableConnectorMockFallback;
		}
		if (toolId.startsWith('connector_confluence')) {
			const ok =
				this.appConfig.enableConfluenceConnector &&
				!!this.appConfig.confluenceBaseUrl &&
				!!this.appConfig.confluenceEmail &&
				!!this.appConfig.confluenceApiToken;
			return !ok && this.appConfig.enableConnectorMockFallback;
		}
		if (toolId.startsWith('connector_support')) {
			const p = this.appConfig.supportConnectorProvider;
			const zd =
				p === 'zendesk' &&
				this.appConfig.enableSupportConnector &&
				!!this.appConfig.zendeskBaseUrl &&
				!!this.appConfig.zendeskEmail &&
				!!this.appConfig.zendeskApiToken;
			const sn =
				p === 'servicenow' &&
				this.appConfig.enableSupportConnector &&
				!!this.appConfig.servicenowBaseUrl &&
				!!this.appConfig.servicenowUsername &&
				!!this.appConfig.servicenowPassword;
			return !zd && !sn && this.appConfig.enableConnectorMockFallback;
		}
		return false;
	}

	private async runConnector(req: ToolExecutionRequest): Promise<{ output: Record<string, unknown> }> {
		const connectorId = this.connectorRegistry.getConnectorForTool(req.toolId) ?? 'system';
		await this.emit(req.sessionId, req.runId, req.agentSlug, 'connector_call_started', req.toolId, {
			connectorId,
			toolId: req.toolId,
		});
		const callId = newId('ccall');
		try {
			const out = await this.connectorHub.executeConnectorTool(req.toolId, req.input ?? {});
			const meta = (out['metadata'] as Record<string, unknown> | undefined) ?? {};
			const summary = typeof out['summary'] === 'string' ? out['summary'] : undefined;
			const blocked = meta['blocked'] === true;
			await this.connectorCalls.create({
				id: callId,
				connectorId,
				provider: String(meta['connectorSource'] ?? connectorId),
				operation: req.toolId,
				inputJson: JSON.stringify(req.input ?? {}),
				outputSummary: summary?.slice(0, 2000) ?? null,
				status: blocked ? 'blocked' : 'success',
				error: null,
				createdAt: new Date(),
				completedAt: new Date(),
			});
			if (this.connectorFallbackLikely(req.toolId)) {
				await this.emit(req.sessionId, req.runId, req.agentSlug, 'connector_fallback_used', req.toolId, {
					connectorId,
					toolId: req.toolId,
				});
			}
			await this.emit(req.sessionId, req.runId, req.agentSlug, 'connector_call_completed', req.toolId, {
				connectorId,
				toolId: req.toolId,
			});
			return { output: out };
		} catch (e) {
			const err = e instanceof Error ? e.message : String(e);
			await this.connectorCalls.create({
				id: callId,
				connectorId,
				provider: 'error',
				operation: req.toolId,
				inputJson: JSON.stringify(req.input ?? {}),
				outputSummary: null,
				status: 'failed',
				error: err,
				createdAt: new Date(),
				completedAt: new Date(),
			});
			await this.emit(req.sessionId, req.runId, req.agentSlug, 'connector_call_failed', req.toolId, {
				connectorId,
				error: err,
			});
			throw e;
		}
	}

	private async runBrowser(req: ToolExecutionRequest, forceApproved: boolean): Promise<{ output: Record<string, unknown> }> {
		const bs = await this.browserSessions.getOrCreateActiveSession(req.sessionId, req.runId, req.agentSlug);
		await this.browserWorker.ensureBrowserSession(bs);

		switch (req.toolId) {
			case 'browser_profile_list': {
				const list = await this.browserProfiles.listProfiles();
				return { output: { profiles: list } };
			}
			case 'browser_profile_create': {
				const p = await this.browserProfiles.createProfile({
					name: String(req.input['name']),
					description: req.input['description'] as string | undefined,
					targetBaseUrl: req.input['targetBaseUrl'] as string | undefined,
					environment: req.input['environment'] as string | undefined,
					createdByUserId: req.actorUserId,
				});
				await this.emit(req.sessionId, req.runId, req.agentSlug, 'browser_profile_created', 'Browser profile created', {
					profileId: p.id,
				});
				await this.auditLog(req, 'browser_profile_create', { profileId: p.id });
				return { output: { profile: this.browserProfiles.toPublic(p) } };
			}
			case 'browser_auth_capture_start': {
				const { capture, browserSession } = await this.browserAuthCapture.startAuthCapture({
					agentSessionId: req.sessionId,
					runId: req.runId,
					agentSlug: req.agentSlug,
					profileId: req.input['profileId'] as string | undefined,
					profileName: req.input['profileName'] as string | undefined,
					loginUrl: req.input['loginUrl'] as string | undefined,
					createdByUserId: req.actorUserId,
				});
				await this.emit(req.sessionId, req.runId, req.agentSlug, 'browser_auth_capture_started', 'Auth capture started', {
					captureId: capture.id,
					profileId: capture.profileId,
				});
				await this.emit(
					req.sessionId,
					req.runId,
					req.agentSlug,
					'browser_auth_waiting_for_login',
					'Waiting for manual login',
					{ captureId: capture.id },
				);
				await this.auditLog(req, 'browser_auth_capture_start', { captureId: capture.id });
				return {
					output: {
						capture,
						browserSessionId: browserSession.id,
						message: 'Log in via browser preview, then complete capture with browser_auth_capture_complete.',
					},
				};
			}
			case 'browser_auth_capture_complete': {
				const captureId = String(req.input['captureId']);
				const profile = await this.browserAuthCapture.completeAuthCapture(captureId);
				await this.emit(req.sessionId, req.runId, req.agentSlug, 'browser_auth_saved', 'Session saved', {
					profileId: profile.id,
				});
				await this.emit(req.sessionId, req.runId, req.agentSlug, 'browser_profile_ready', 'Profile ready', {
					profileId: profile.id,
				});
				await this.auditLog(req, 'browser_auth_capture_complete', { profileId: profile.id });
				return { output: { profile: this.browserProfiles.toPublic(profile) } };
			}
			case 'browser_create_demo_auth_profile': {
				const profile = await this.browserAuthCapture.runDemoLoginAndSaveProfile({
					agentSessionId: req.sessionId,
					runId: req.runId,
					agentSlug: req.agentSlug,
					profileName: req.input['profileName'] as string | undefined,
					forceApproved,
				});
				await this.emit(req.sessionId, req.runId, req.agentSlug, 'browser_profile_ready', 'Demo profile ready', {
					profileId: profile.id,
				});
				await this.auditLog(req, 'browser_demo_auth_profile', { profileId: profile.id });
				return { output: { profile: this.browserProfiles.toPublic(profile) } };
			}
			case 'browser_open_authenticated': {
				const profileId = String(req.input['profileId']);
				const url = String(req.input['url']);
				const storagePath = await this.browserProfiles.getStorageStatePath(profileId);
				const snap = await this.browserWorker.openAuthenticatedSession(bs.id, storagePath, url, req.runId);
				await this.emit(req.sessionId, req.runId, req.agentSlug, 'browser_authenticated_session_opened', 'Authenticated', {
					profileId,
					url: snap.url,
				});
				return { output: { snapshot: snap, browserSessionId: bs.id, profileId } };
			}
			case 'browser_open_url':
			case 'browser_open_mock': {
				const url = String(req.input['url'] ?? this.appConfig.browserDefaultUrl);
				const snap = await this.browserWorker.openUrl(bs.id, url, req.runId);
				await this.emit(req.sessionId, req.runId, req.agentSlug, 'browser_opened', 'Browser opened', {
					url: snap.url,
					browserSessionId: bs.id,
				});
				await this.emit(req.sessionId, req.runId, req.agentSlug, 'browser_navigated', 'Navigated', {
					url: snap.url,
				});
				return { output: { snapshot: snap, browserSessionId: bs.id } };
			}
			case 'browser_take_screenshot': {
				const snap = await this.browserWorker.takeScreenshot(bs.id, req.runId);
				await this.emit(req.sessionId, req.runId, req.agentSlug, 'browser_screenshot_created', 'Screenshot', {
					url: snap.screenshotUrl,
				});
				return { output: { snapshot: snap } };
			}
			case 'browser_inspect_dom':
			case 'browser_inspect_mock': {
				const snap = await this.browserWorker.inspectDom(bs.id, req.runId);
				await this.emit(req.sessionId, req.runId, req.agentSlug, 'browser_dom_inspected', 'DOM inspected', {});
				return { output: { snapshot: snap } };
			}
			case 'browser_click': {
				const snap = await this.browserWorker.click(bs.id, String(req.input['selector']), req.runId, forceApproved);
				await this.emit(req.sessionId, req.runId, req.agentSlug, 'browser_action_completed', 'Click', {});
				return { output: { snapshot: snap } };
			}
			case 'browser_fill': {
				const snap = await this.browserWorker.fill(
					bs.id,
					String(req.input['selector']),
					String(req.input['value'] ?? ''),
					req.runId,
					forceApproved,
				);
				await this.emit(req.sessionId, req.runId, req.agentSlug, 'browser_action_completed', 'Fill', {});
				return { output: { snapshot: snap } };
			}
			case 'browser_press': {
				const snap = await this.browserWorker.press(
					bs.id,
					String(req.input['selector']),
					String(req.input['key'] ?? 'Enter'),
					req.runId,
					forceApproved,
				);
				await this.emit(req.sessionId, req.runId, req.agentSlug, 'browser_action_completed', 'Press', {});
				return { output: { snapshot: snap } };
			}
			case 'browser_extract_text': {
				const snap = await this.browserWorker.extractText(bs.id, req.runId);
				return { output: { snapshot: snap } };
			}
			case 'browser_close': {
				await this.browserWorker.close(bs.id);
				return { output: { closed: true } };
			}
			default: {
				const r = await this.runLegacyMock(req);
				return { output: r.output ?? {} };
			}
		}
	}

	private async runPlaywright(
		req: ToolExecutionRequest,
		_forceApproved: boolean,
	): Promise<{ output: Record<string, unknown>; artifactIds?: string[] }> {
		switch (req.toolId) {
			case 'playwright_generate_spec': {
				const spec = await this.playwrightRunner.generateSpecArtifact({
					sessionId: req.sessionId,
					runId: req.runId,
					agentSlug: req.agentSlug,
					title: String(req.input['title']),
					message: req.input['message'] as string | undefined,
				});
				const art = await this.artifacts.createArtifact({
					sessionId: req.sessionId,
					runId: req.runId,
					agentSlug: req.agentSlug,
					type: 'playwright_spec',
					title: spec.title,
					description: 'Generated Playwright draft',
					content: spec.content,
					language: 'typescript',
				});
				await this.emit(req.sessionId, req.runId, req.agentSlug, 'playwright_spec_generated', 'Spec generated', {
					specId: spec.id,
				});
				return { output: { specId: spec.id, artifactId: art.id }, artifactIds: [art.id] };
			}
			case 'playwright_generate_from_template': {
				const spec = await this.playwrightRunner.generateSpecFromTemplate({
					sessionId: req.sessionId,
					runId: req.runId,
					agentSlug: req.agentSlug,
					templateKey: String(req.input['templateKey']),
				});
				await this.emit(req.sessionId, req.runId, req.agentSlug, 'playwright_spec_generated', 'Template spec', {
					specId: spec.id,
				});
				return { output: { spec } };
			}
			case 'playwright_validate_spec': {
				const specId = String(req.input['specId']);
				const v = await this.playwrightRunner.validateStoredSpec(specId);
				await this.emit(req.sessionId, req.runId, req.agentSlug, 'playwright_spec_validated', 'Spec validated', {
					specId,
					valid: v.valid,
				});
				return { output: { valid: v.valid, reasons: v.reasons } };
			}
			case 'playwright_run_template': {
				await this.emit(req.sessionId, req.runId, req.agentSlug, 'playwright_run_started', 'Test run started', {
					templateKey: req.input['templateKey'],
				});
				try {
					const run = await this.playwrightRunner.runTemplateTest({
						sessionId: req.sessionId,
						runId: req.runId,
						agentSlug: req.agentSlug,
						templateKey: String(req.input['templateKey']),
						profileId: req.input['profileId'] as string | undefined,
					});
					for (const c of run.results) {
						await this.emit(req.sessionId, req.runId, req.agentSlug, 'playwright_test_case_completed', c.title, {
							status: c.status,
							testRunId: run.id,
						});
					}
					const evType: import('../../agents/models/agent-runtime-event.model').AgentRuntimeEventType =
						run.status === 'failed' ? 'playwright_run_failed' : 'playwright_run_completed';
					await this.emit(req.sessionId, req.runId, req.agentSlug, evType, 'Playwright run finished', {
						testRunId: run.id,
						status: run.status,
					});
					const templateKey = String(req.input['templateKey'] ?? '');
					const reportUrl = run.reportPath ? `Report: ${run.reportPath}\n` : '';
					const shot = run.screenshotPath ? `Screenshot: ${run.screenshotPath}\n` : '';
					const art = await this.artifacts.createArtifact({
						sessionId: req.sessionId,
						runId: req.runId,
						agentSlug: req.agentSlug,
						type: 'test_report',
						title: `Test report ${run.id}`,
						description: templateKey || 'playwright template',
						content: `## Run ${run.id}\nTemplate: ${templateKey}\nStatus: ${run.status}\nPassed: ${run.passed} Failed: ${run.failed}\n${reportUrl}${shot}`,
					});
					await this.auditLog(req, 'playwright_run_template', { testRunId: run.id });
					return { output: { testRun: run }, artifactIds: [art.id] };
				} catch (e) {
					const err = e instanceof Error ? e.message : String(e);
					await this.emit(req.sessionId, req.runId, req.agentSlug, 'playwright_run_failed', 'Run failed', { error: err });
					throw e;
				}
			}
			case 'playwright_run_validated_spec': {
				await this.emit(req.sessionId, req.runId, req.agentSlug, 'playwright_run_started', 'Validated spec run', {});
				const run = await this.playwrightRunner.runValidatedSpec({
					sessionId: req.sessionId,
					runId: req.runId,
					agentSlug: req.agentSlug,
					specId: String(req.input['specId']),
					profileId: req.input['profileId'] as string | undefined,
				});
				await this.emit(req.sessionId, req.runId, req.agentSlug, 'playwright_run_completed', 'Run recorded', {
					testRunId: run.id,
					status: run.status,
				});
				await this.auditLog(req, 'playwright_run_validated_spec', { testRunId: run.id });
				return { output: { testRun: run } };
			}
			case 'playwright_list_runs': {
				const runs = await this.playwrightRunner.listTestRuns(req.sessionId);
				return { output: { runs } };
			}
			case 'playwright_get_run': {
				const run = await this.playwrightRunner.getTestRun(String(req.input['testRunId']));
				return { output: { testRun: run } };
			}
			default:
				return this.runLegacyMock(req);
		}
	}

	private async runTesting(req: ToolExecutionRequest): Promise<{ output: Record<string, unknown>; artifactIds?: string[] }> {
		switch (req.toolId) {
			case 'test_generate_plan': {
				const art = await this.artifacts.createArtifact({
					sessionId: req.sessionId,
					runId: req.runId,
					agentSlug: req.agentSlug,
					type: 'markdown',
					title: 'Regression test plan',
					description: 'Generated plan',
					content: `## Login regression\n- [ ] Valid login\n- [ ] Invalid password\n- [ ] Session timeout\n`,
				});
				return { output: { artifactId: art.id }, artifactIds: [art.id] };
			}
			case 'test_generate_playwright':
			case 'playwright_generate': {
				const art = await this.artifacts.createArtifact({
					sessionId: req.sessionId,
					runId: req.runId,
					agentSlug: req.agentSlug,
					type: 'typescript',
					title: 'login.spec.ts',
					description: 'Playwright outline',
					content: `import { test, expect } from '@playwright/test';\ntest('login smoke', async ({ page }) => {\n  await page.goto('/');\n});\n`,
					language: 'typescript',
				});
				return { output: { artifactId: art.id }, artifactIds: [art.id] };
			}
			case 'test_run_smoke_mock': {
				const tr = this.tests.createMockTestRun(req.sessionId, req.runId, req.agentSlug, 'smoke');
				await this.emit(req.sessionId, req.runId, req.agentSlug, 'test_run_completed', 'Tests finished', {
					id: tr.id,
				});
				return { output: { testRunId: tr.id, passed: tr.passed, failed: tr.failed } };
			}
			case 'test_run_browser_flow': {
				const bs = await this.browserSessions.getOrCreateActiveSession(req.sessionId, req.runId, req.agentSlug);
				await this.browserWorker.ensureBrowserSession(bs);
				const snap = await this.browserWorker.openUrl(bs.id, this.appConfig.browserDefaultUrl, req.runId);
				await this.emit(req.sessionId, req.runId, req.agentSlug, 'browser_opened', 'Browser flow', {
					url: snap.url,
				});
				const tr = this.tests.createMockTestRun(req.sessionId, req.runId, req.agentSlug, 'browser-flow');
				return { output: { snapshot: snap, testRunId: tr.id } };
			}
			default:
				return this.runLegacyMock(req);
		}
	}

	private async runArtifact(req: ToolExecutionRequest): Promise<{ output: Record<string, unknown>; artifactIds?: string[] }> {
		const title = String(req.input['title'] ?? 'Artifact');
		const body = String(req.input['content'] ?? '');
		let type: import('../../agents/models/agent-artifact.model').AgentArtifactType = 'markdown';
		if (req.toolId.includes('code')) type = 'typescript';
		if (req.toolId.includes('sql')) type = 'sql';
		if (req.toolId.includes('test')) type = 'typescript';
		if (req.toolId.includes('email')) type = 'email';
		if (req.toolId.includes('yaml')) type = 'yaml';
		const art = await this.artifacts.createArtifact({
			sessionId: req.sessionId,
			runId: req.runId,
			agentSlug: req.agentSlug,
			type,
			title,
			description: req.toolId,
			content: body || `# ${title}\n\n(Content placeholder)`,
			language: req.input['language'] as string | undefined,
		});
		return { output: { artifactId: art.id }, artifactIds: [art.id] };
	}

	private async runLegacyMock(req: ToolExecutionRequest): Promise<{ output: Record<string, unknown> }> {
		const m = this.executeMockTool(req.runId, req.agentSlug, req.toolId, req.input);
		return { output: m.output };
	}

	private async auditLog(req: ToolExecutionRequest, action: string, details: Record<string, unknown>): Promise<void> {
		if (!this.appConfig.enableAuditLogs) return;
		let actorEmail: string | undefined;
		if (req.actorUserId) {
			const u = await this.rbac.loadAuthUser(req.actorUserId);
			actorEmail = u?.email;
		}
		await this.audit.record({
			actorUserId: req.actorUserId,
			actorEmail,
			sessionId: req.sessionId,
			runId: req.runId,
			agentSlug: req.agentSlug,
			action,
			details,
		});
	}

	async resumeByApproval(approvalId: string, decision: 'approved' | 'rejected'): Promise<ToolExecutionResult | void> {
		const exec = await this.repo.findByApprovalId(approvalId);
		if (!exec) return;

		if (decision === 'rejected') {
			await this.repo.update(exec.id, { status: 'cancelled', error: 'rejected', completedAt: new Date() });
			const run = await this.runs.getRun(exec.runId);
			await this.emit(exec.sessionId, exec.runId, run.agentSlug, 'tool_call_failed', exec.toolId, {
				reason: 'approval_rejected',
			});
			return { executionId: exec.id, status: 'cancelled', error: 'approval_rejected' };
		}

		const run = await this.runs.getRun(exec.runId);
		const input = exec.input ?? {};
		const req: ToolExecutionRequest = {
			runId: exec.runId,
			sessionId: exec.sessionId,
			agentSlug: exec.agentSlug,
			mode: run.mode as 'ask' | 'plan' | 'act',
			toolId: exec.toolId,
			input,
			actorUserId: run.actorUserId,
		};
		return this.execute(req, { forceApproved: true, existingExecutionId: exec.id });
	}
}
