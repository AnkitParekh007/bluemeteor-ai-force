import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import { RagContextBuilderService } from '../../rag/services/rag-context-builder.service';
import { AiProviderRouterService } from '../../providers/services/ai-provider-router.service';
import type { AiProviderRequest } from '../../providers/models/ai-provider.model';
import type { AiProviderStreamEvent } from '../../providers/models/ai-provider.model';
import { BrowserWorkerService } from '../../browser/services/browser-worker.service';
import type { ToolExecutionResult } from '../../tools/models/tool-execution.model';
import { ToolExecutorService } from '../../tools/services/tool-executor.service';
import { ToolPermissionService } from '../../tools/services/tool-permission.service';
import { ToolRegistryService } from '../../tools/services/tool-registry.service';
import { TestRunnerService } from '../../testing/services/test-runner.service';
import { isoNow } from '../../common/utils/dates';
import { newId } from '../../common/utils/ids';
import type { AgentMessage } from '../models/agent-message.model';
import type { AgentArtifact } from '../models/agent-artifact.model';
import type { AgentApprovalRequest, AgentRunStep, AgentRun as AgentRunFull } from '../models/agent-run.model';
import type { AgentRuntimeEvent, AgentRuntimeEventType } from '../models/agent-runtime-event.model';

import { AgentApprovalService } from './agent-approval.service';
import { AgentArtifactService } from './agent-artifact.service';
import { AgentAuditLogService } from './agent-audit-log.service';
import { AgentConfigRegistryService } from './agent-config-registry.service';
import { AgentContextBuilderService } from './agent-context-builder.service';
import { AgentEventBusService } from './agent-event-bus.service';
import { AgentRunService } from './agent-run.service';
import { AgentSessionService } from './agent-session.service';

export interface ExecuteMessageInput {
	readonly sessionId: string;
	readonly agentSlug: string;
	readonly mode: 'ask' | 'plan' | 'act';
	readonly message: string;
	readonly context?: Record<string, unknown>;
	readonly actorUserId?: string;
	readonly actorEmail?: string;
}

export interface AgentSendResponsePayload {
	readonly run: AgentRunFull;
	readonly message: AgentMessage;
	readonly artifacts: AgentArtifact[];
	readonly events: AgentRuntimeEvent[];
	readonly suggestedChips?: string[];
	readonly testResults?: Array<{
		readonly id: string;
		readonly title: string;
		readonly status: 'passed' | 'failed' | 'skipped' | 'running';
		readonly durationMs?: number;
		readonly error?: string;
	}> | null;
	readonly browserPatch?: {
		readonly isOpen: boolean;
		readonly currentUrl: string;
		readonly title: string;
		readonly loading: boolean;
	} | null;
	readonly consoleLines?: Array<{
		readonly level: 'info' | 'warning' | 'error' | 'success';
		readonly message: string;
		readonly source: 'agent' | 'browser' | 'tool' | 'system';
	}>;
}

export interface StreamStartPayload {
	readonly runId: string;
	readonly streamUrl: string;
	/** Server-persisted user message id (avoid duplicate optimistic ids in UI). */
	readonly userMessageId: string;
}

interface PlannedToolCall {
	readonly toolId: string;
	readonly input: Record<string, unknown>;
}

@Injectable()
export class AgentOrchestratorService {
	constructor(
		private readonly appConfig: AppConfigService,
		private readonly registry: AgentConfigRegistryService,
		private readonly sessions: AgentSessionService,
		private readonly runs: AgentRunService,
		private readonly artifacts: AgentArtifactService,
		private readonly approvals: AgentApprovalService,
		private readonly events: AgentEventBusService,
		private readonly audit: AgentAuditLogService,
		private readonly providerRouter: AiProviderRouterService,
		private readonly toolPerm: ToolPermissionService,
		private readonly toolRegistry: ToolRegistryService,
		private readonly toolExec: ToolExecutorService,
		private readonly browser: BrowserWorkerService,
		private readonly tests: TestRunnerService,
		private readonly rag: RagContextBuilderService,
		private readonly contextBuilder: AgentContextBuilderService,
	) {}

	async executeMessage(input: ExecuteMessageInput): Promise<AgentSendResponsePayload> {
		this.validateMessage(input.message);
		const collected: AgentRuntimeEvent[] = [];
		const emit = this.makeEmit(collected);
		return this.runCore(input, emit, collected);
	}

	async startStreamingMessage(input: ExecuteMessageInput): Promise<StreamStartPayload> {
		this.validateMessage(input.message);
		if (!this.registry.hasConfig(input.agentSlug)) {
			throw new NotFoundException(`Unknown agent: ${input.agentSlug}`);
		}
		const session = await this.sessions.getSession(input.sessionId);
		if (session.agentSlug !== input.agentSlug) {
			throw new BadRequestException('agentSlug does not match session');
		}

		const userMsg: AgentMessage = {
			id: newId('msg'),
			sessionId: input.sessionId,
			role: 'user',
			content: input.message,
			createdAt: isoNow(),
			status: 'done',
		};
		await this.sessions.addMessage(input.sessionId, userMsg);
		await this.sessions.incrementMessageCount(input.sessionId);
		await this.sessions.updateSessionPreview(input.sessionId, input.message.slice(0, 120));
		await this.sessions.updateSessionStatus(input.sessionId, 'running');

		const run = await this.runs.createRun(input.sessionId, input.agentSlug, input.mode, input.message, {
			actorUserId: input.actorUserId,
			actorEmail: input.actorEmail,
		});
		const runId = run.id;
		await this.logAudit(input, { sessionId: input.sessionId, agentSlug: input.agentSlug, action: 'stream_started', details: { runId } });

		setImmediate(() => {
			void this.executeRunStreaming(input, runId, userMsg.id).catch((e) => {
				const msg = e instanceof Error ? e.message : String(e);
				void this.failRunStreaming(input, runId, msg);
			});
		});

		const streamUrl = `/agents/sessions/${encodeURIComponent(input.sessionId)}/runs/${encodeURIComponent(runId)}/events`;
		return { runId, streamUrl, userMessageId: userMsg.id };
	}

	private validateMessage(message: string): void {
		if (message.length > this.appConfig.maxMessageChars) {
			throw new BadRequestException(
				`Message exceeds maximum length of ${this.appConfig.maxMessageChars} characters.`,
			);
		}
	}

	private makeEmit(collected: AgentRuntimeEvent[]) {
		return async (
			type: AgentRuntimeEventType,
			title: string,
			runId: string,
			sessionId: string,
			agentSlug: string,
			payload?: Record<string, unknown>,
			msg?: string,
		) => {
			const ev: AgentRuntimeEvent = {
				id: newId('evt'),
				runId,
				sessionId,
				agentSlug,
				type,
				title,
				message: msg,
				timestamp: isoNow(),
				payload,
			};
			collected.push(ev);
			await this.events.emit(ev);
		};
	}

	private async runCore(
		input: ExecuteMessageInput,
		emit: ReturnType<AgentOrchestratorService['makeEmit']>,
		collected: AgentRuntimeEvent[],
	): Promise<AgentSendResponsePayload> {
		const { sessionId, agentSlug, mode, message, context } = input;

		if (!this.registry.hasConfig(agentSlug)) {
			throw new NotFoundException(`Unknown agent: ${agentSlug}`);
		}
		const cfg = this.registry.getConfig(agentSlug)!;

		const session = await this.sessions.getSession(sessionId);
		if (session.agentSlug !== agentSlug) {
			throw new BadRequestException('agentSlug does not match session');
		}

		const userMsg: AgentMessage = {
			id: newId('msg'),
			sessionId,
			role: 'user',
			content: message,
			createdAt: isoNow(),
			status: 'done',
		};
		await this.sessions.addMessage(sessionId, userMsg);
		await this.sessions.incrementMessageCount(sessionId);
		await this.sessions.updateSessionPreview(sessionId, message.slice(0, 120));
		await this.sessions.updateSessionStatus(sessionId, 'running');

		await this.logAudit(input, { sessionId, agentSlug, action: 'message_sent', details: { len: message.length } });

		let run = await this.runs.createRun(sessionId, agentSlug, mode, message, {
			actorUserId: input.actorUserId,
			actorEmail: input.actorEmail,
		});
		const runId = run.id;

		await emit('run_started', 'Run started', runId, sessionId, agentSlug, { runId });

		const step = (title: string, desc: string): AgentRunStep => ({
			id: newId('step'),
			runId,
			title,
			description: desc,
			status: 'running',
			startedAt: isoNow(),
		});

		let s1 = step('Understanding request', 'Parse intent and constraints');
		run = await this.runs.addStep(runId, s1);
		await emit('step_started', s1.title, runId, sessionId, agentSlug);
		run = await this.runs.updateStep(runId, s1.id, { status: 'completed', completedAt: isoNow() });
		await emit('step_completed', 'Understanding request', runId, sessionId, agentSlug);

		let s2 = step('Loading agent config', cfg.displayName);
		run = await this.runs.addStep(runId, s2);
		await emit('step_started', s2.title, runId, sessionId, agentSlug);
		run = await this.runs.updateStep(runId, s2.id, { status: 'completed', completedAt: isoNow() });
		await emit('step_completed', 'Loading agent config', runId, sessionId, agentSlug);

		let sRag = step('Searching knowledge', 'Retrieve internal context');
		run = await this.runs.addStep(runId, sRag);
		await emit('step_started', sRag.title, runId, sessionId, agentSlug);
		let ragContext = '';
		try {
			ragContext = await this.rag.buildContextForAgent(agentSlug, message);
		} catch {
			ragContext = '';
		}
		if (ragContext) {
			await emit('step_completed', 'Knowledge context loaded', runId, sessionId, agentSlug, {
				chars: ragContext.length,
			});
		} else if (this.appConfig.enableDebugRuntimeLogs) {
			await emit('step_completed', 'No knowledge hits', runId, sessionId, agentSlug);
		} else {
			await emit('step_completed', 'Knowledge search skipped', runId, sessionId, agentSlug);
		}
		run = await this.runs.updateStep(runId, sRag.id, { status: 'completed', completedAt: isoNow() });

		let s3 = step('Planning tools', 'Select deterministic tools before provider');
		run = await this.runs.addStep(runId, s3);
		await emit('step_started', s3.title, runId, sessionId, agentSlug);

		const plannedTools = this.planToolsForMessage(agentSlug, mode, message, sessionId);
		await emit(
			'step_completed',
			`Planned ${plannedTools.length} tool call(s)`,
			runId,
			sessionId,
			agentSlug,
			{ tools: plannedTools.map((p) => p.toolId) },
		);

		const toolPhase = await this.runToolExecutionPhase(
			sessionId,
			runId,
			agentSlug,
			mode,
			input.actorUserId,
			plannedTools,
			emit,
		);

		run = await this.runs.updateStep(runId, s3.id, { status: 'completed', completedAt: isoNow() });
		await emit('step_completed', 'Tools phase completed', runId, sessionId, agentSlug);

		if (toolPhase.stoppedForApproval && toolPhase.approvalId) {
			run = await this.runs.getRun(runId);
			const appr = run.approvals.find((a) => a.id === toolPhase.approvalId);
			const title = appr?.title ?? 'Approval required';
			const desc = appr?.description ?? 'A tool requires approval before execution can continue.';
			await emit('approval_required', title, runId, sessionId, agentSlug, { approvalId: toolPhase.approvalId }, desc);

			const assistant: AgentMessage = {
				id: newId('msg'),
				sessionId,
				role: 'agent',
				content: `**Approval required:** ${title}\n\n${desc}\n\nApprove in the workspace to run the pending tool.`,
				createdAt: isoNow(),
				status: 'done',
				metadata: { runId, approvalId: toolPhase.approvalId },
			};
			await this.sessions.addMessage(sessionId, assistant);
			await this.logAudit(input, { sessionId, runId, agentSlug, action: 'approval_required', details: { approvalId: toolPhase.approvalId } });

			run = await this.runs.getRun(runId);
			return this.wrapResponse(run, assistant, [], collected, undefined, undefined, undefined);
		}

		const risky = this.appConfig.enableApprovalGates ? this.approvals.detectRiskyAction(agentSlug, message) : null;

		if (risky) {
			const appr = await this.approvals.createApproval(runId, risky, input.actorUserId);
			run = await this.runs.updateRun(runId, {
				status: 'waiting_for_approval',
				updatedAt: isoNow(),
			});
			await emit('approval_required', appr.title, runId, sessionId, agentSlug, { approvalId: appr.id }, appr.description);

			const assistant: AgentMessage = {
				id: newId('msg'),
				sessionId,
				role: 'agent',
				content: `**Approval required:** ${appr.title}\n\n${appr.description}\n\nResolve the approval in the workspace to continue.`,
				createdAt: isoNow(),
				status: 'done',
				metadata: { runId, approvalId: appr.id },
			};
			await this.sessions.addMessage(sessionId, assistant);
			await this.logAudit(input, { sessionId, runId, agentSlug, action: 'approval_required', details: { approvalId: appr.id } });

			run = await this.runs.getRun(runId);
			return this.wrapResponse(run, assistant, [], collected, undefined, undefined, undefined);
		}

		run = await this.runs.updateRun(runId, { status: 'thinking', updatedAt: isoNow() });

		const prior = (await this.sessions.listMessages(sessionId))
			.filter((m) => m.id !== userMsg.id && m.role !== 'system')
			.slice(-12)
			.map((m) => ({
				role: m.role === 'agent' ? ('agent' as const) : m.role === 'user' ? ('user' as const) : ('system' as const),
				content: m.content,
			}));

		const systemPrompt = await this.rag.buildAugmentedSystemPrompt(cfg.systemPrompt, ragContext);

		const wrappedTools = this.contextBuilder.buildToolContextForProvider(toolPhase.toolContextBlock);
		const aiReq: AiProviderRequest = {
			agentSlug,
			systemPrompt,
			mode,
			userMessage: message,
			toolContextBlock: wrappedTools ?? toolPhase.toolContextBlock,
			context: {
				...context,
				ragContext,
				toolExecutionSummaries: wrappedTools ?? toolPhase.toolContextBlock,
			},
			history: prior,
		};

		let finalAnswer: string;
		try {
			await this.logAudit(input, { sessionId, runId, agentSlug, action: 'provider_used', details: { provider: this.providerRouter.getActiveProviderName() } });
			const res = await this.providerRouter.generate(aiReq);
			finalAnswer = res.content;
		} catch (e) {
			const err = e instanceof Error ? e.message : String(e);
			run = await this.runs.updateRun(runId, {
				status: 'failed',
				error: err,
				updatedAt: isoNow(),
				completedAt: isoNow(),
			});
			await emit('run_failed', 'Provider error', runId, sessionId, agentSlug, { error: err });
			await this.sessions.updateSessionStatus(sessionId, 'failed');
			const assistantErr: AgentMessage = {
				id: newId('msg'),
				sessionId,
				role: 'agent',
				content: `Run failed: ${err}`,
				createdAt: isoNow(),
				status: 'error',
				metadata: { runId },
			};
			await this.sessions.addMessage(sessionId, assistantErr);
			await this.logAudit(input, { sessionId, runId, agentSlug, action: 'run_failed', details: { error: err } });
			return this.wrapResponse(run, assistantErr, [], collected, undefined, undefined, undefined);
		}

		run = await this.runs.updateRun(runId, { status: 'executing', updatedAt: isoNow() });

		const arts = await this.artifacts.generateForRun({
			sessionId,
			runId,
			agentSlug,
			userMessage: message,
			finalAnswer,
		});
		for (const a of arts) {
			await emit('artifact_created', a.title, runId, sessionId, agentSlug, { artifactId: a.id, type: a.type });
			await this.logAudit(input, { sessionId, runId, agentSlug, action: 'artifact_created', details: { artifactId: a.id } });
		}
		await emit('message_created', 'Assistant message', runId, sessionId, agentSlug);

		let browserPatch: AgentSendResponsePayload['browserPatch'] = toolPhase.browserPatch ?? null;
		let testResults: AgentSendResponsePayload['testResults'] = toolPhase.testResults ?? null;
		if (plannedTools.length === 0) {
			if (/\b(browser|open app|test|playwright)\b/i.test(message)) {
				this.browser.openBrowserMock(sessionId, runId);
				await emit('browser_opened', 'Browser (mock)', runId, sessionId, agentSlug, { url: 'http://localhost:4200' });
				await emit('browser_navigated', 'Navigated', runId, sessionId, agentSlug, { url: 'http://localhost:4200' });
				browserPatch = {
					isOpen: true,
					currentUrl: 'http://localhost:4200',
					title: 'Bluemeteor AI Force (local)',
					loading: false,
				};
			}
			if (agentSlug === 'testo' || /\b(test|playwright|regression|login)\b/i.test(message)) {
				await emit('test_run_started', 'Mock test run', runId, sessionId, agentSlug);
				const tr = this.tests.createMockTestRun(sessionId, runId, agentSlug, message);
				await emit('test_run_completed', 'Tests finished', runId, sessionId, agentSlug, {
					id: tr.id,
					passed: tr.passed,
					failed: tr.failed,
				});
				testResults = tr.results.map((r) => ({
					id: newId('tr'),
					title: r.title,
					status: r.status,
					durationMs: r.durationMs,
					error: r.error,
				}));
			}
		}

		run = await this.runs.updateRun(runId, {
			status: 'completed',
			finalAnswer,
			updatedAt: isoNow(),
			completedAt: isoNow(),
		});
		await emit('run_completed', 'Run completed', runId, sessionId, agentSlug);

		const assistant: AgentMessage = {
			id: newId('msg'),
			sessionId,
			role: 'agent',
			content: finalAnswer,
			createdAt: isoNow(),
			status: 'done',
			metadata: { runId },
		};
		await this.sessions.addMessage(sessionId, assistant);
		await this.sessions.updateSessionStatus(sessionId, 'idle');
		await this.logAudit(input, { sessionId, runId, agentSlug, action: 'run_completed', details: {} });

		const chips = this.chips(mode, agentSlug);
		const consoleLines: NonNullable<AgentSendResponsePayload['consoleLines']> = [
			{ level: 'info', message: `Provider: ${this.providerRouter.getActiveProviderName()}`, source: 'system' },
			{ level: 'info', message: `Run ${runId} completed`, source: 'agent' },
		];
		if (browserPatch) consoleLines.push({ level: 'info', message: 'Browser preview (mock)', source: 'browser' });
		if (testResults?.length) consoleLines.push({ level: 'success', message: 'Mock tests attached', source: 'tool' });

		return this.wrapResponse(await this.runs.getRun(runId), assistant, arts, collected, testResults, browserPatch, consoleLines, chips);
	}

	private async executeRunStreaming(input: ExecuteMessageInput, runId: string, _userMsgId: string): Promise<void> {
		const collected: AgentRuntimeEvent[] = [];
		const emit = this.makeEmit(collected);
		const { sessionId, agentSlug, mode, message, context } = input;
		const cfg = this.registry.getConfig(agentSlug)!;

		await emit('run_started', 'Run started', runId, sessionId, agentSlug, { runId });

		let ragContext = '';
		try {
			ragContext = await this.rag.buildContextForAgent(agentSlug, message);
		} catch {
			ragContext = '';
		}
		await emit('step_started', 'Searching knowledge', runId, sessionId, agentSlug);
		await emit('step_completed', ragContext ? 'Knowledge context loaded' : 'No knowledge hits', runId, sessionId, agentSlug);

		await emit('step_started', 'Tool execution', runId, sessionId, agentSlug);
		const plannedStream = this.planToolsForMessage(agentSlug, mode, message, sessionId);
		const toolPhaseStream = await this.runToolExecutionPhase(
			sessionId,
			runId,
			agentSlug,
			mode,
			input.actorUserId,
			plannedStream,
			emit,
		);
		await emit(
			'step_completed',
			toolPhaseStream.stoppedForApproval ? 'Paused for approval' : `Tools finished (${plannedStream.length})`,
			runId,
			sessionId,
			agentSlug,
		);

		if (toolPhaseStream.stoppedForApproval && toolPhaseStream.approvalId) {
			const runSnap = await this.runs.getRun(runId);
			const appr = runSnap.approvals.find((a) => a.id === toolPhaseStream.approvalId);
			await this.runs.updateRun(runId, { status: 'waiting_for_approval', updatedAt: isoNow() });
			await emit(
				'approval_required',
				appr?.title ?? 'Approval required',
				runId,
				sessionId,
				agentSlug,
				{ approvalId: toolPhaseStream.approvalId },
				appr?.description,
			);
			const assistantEarly: AgentMessage = {
				id: newId('msg'),
				sessionId,
				role: 'agent',
				content: `**Approval required:** ${appr?.title ?? 'Tool'}\n\n${appr?.description ?? ''}`,
				createdAt: isoNow(),
				status: 'done',
				metadata: { runId, approvalId: toolPhaseStream.approvalId },
			};
			await this.sessions.addMessage(sessionId, assistantEarly);
			await this.sessions.updateSessionStatus(sessionId, 'idle');
			await this.logAudit(input, { sessionId, runId, agentSlug, action: 'approval_required', details: { approvalId: toolPhaseStream.approvalId } });
			return;
		}

		const prior = (await this.sessions.listMessages(sessionId))
			.filter((m) => m.role !== 'system')
			.slice(-12)
			.map((m) => ({
				role: m.role === 'agent' ? ('agent' as const) : m.role === 'user' ? ('user' as const) : ('system' as const),
				content: m.content,
			}));

		const systemPrompt = await this.rag.buildAugmentedSystemPrompt(cfg.systemPrompt, ragContext);
		const wrappedStreamTools = this.contextBuilder.buildToolContextForProvider(toolPhaseStream.toolContextBlock);
		const aiReq: AiProviderRequest = {
			agentSlug,
			systemPrompt,
			mode,
			userMessage: message,
			toolContextBlock: wrappedStreamTools ?? toolPhaseStream.toolContextBlock,
			context: {
				...context,
				ragContext,
				toolExecutionSummaries: wrappedStreamTools ?? toolPhaseStream.toolContextBlock,
			},
			history: prior,
		};

		await this.runs.updateRun(runId, { status: 'thinking', updatedAt: isoNow() });

		let finalAnswer = '';
		try {
			let pump: Promise<void> = Promise.resolve();
			const enqueue = (op: () => Promise<void>) => {
				pump = pump.then(op);
			};
			await new Promise<void>((resolve, reject) => {
				this.providerRouter.streamWithFallback(aiReq).subscribe({
					next: (ev: AiProviderStreamEvent) => {
						enqueue(async () => {
							if (ev.type === 'token' && ev.token) {
								finalAnswer += ev.token;
								await emit('token', 'Token', runId, sessionId, agentSlug, { token: ev.token });
							}
							if (ev.type === 'completed' && ev.content) {
								finalAnswer = ev.content;
							}
						});
					},
					error: reject,
					complete: () => {
						void pump.then(() => resolve(), reject);
					},
				});
			});
			if (!finalAnswer.trim()) {
				const res = await this.providerRouter.generate(aiReq);
				finalAnswer = res.content;
				for (const part of finalAnswer.match(/.{1,40}/gs) ?? []) {
					await emit('token', 'Token', runId, sessionId, agentSlug, { token: part });
				}
			}
		} catch (e) {
			const err = e instanceof Error ? e.message : String(e);
			await this.runs.updateRun(runId, {
				status: 'failed',
				error: err,
				updatedAt: isoNow(),
				completedAt: isoNow(),
			});
			await emit('run_failed', 'Run failed', runId, sessionId, agentSlug, { error: err });
			await this.sessions.updateSessionStatus(sessionId, 'failed');
			await this.logAudit(input, { sessionId, runId, agentSlug, action: 'run_failed', details: { error: err } });
			return;
		}

		await this.runs.updateRun(runId, { status: 'executing', updatedAt: isoNow() });

		const arts = await this.artifacts.generateForRun({
			sessionId,
			runId,
			agentSlug,
			userMessage: message,
			finalAnswer,
		});
		for (const a of arts) {
			await emit('artifact_created', a.title, runId, sessionId, agentSlug, { artifactId: a.id });
		}

		await emit('message_created', 'Assistant message', runId, sessionId, agentSlug);

		if (plannedStream.length === 0) {
			if (/\b(browser|open app|test|playwright)\b/i.test(message)) {
				this.browser.openBrowserMock(sessionId, runId);
				await emit('browser_opened', 'Browser (mock)', runId, sessionId, agentSlug, { url: 'http://localhost:4200' });
			}
			if (agentSlug === 'testo' || /\b(test|playwright|regression|login)\b/i.test(message)) {
				await emit('test_run_started', 'Mock test run', runId, sessionId, agentSlug);
				const tr = this.tests.createMockTestRun(sessionId, runId, agentSlug, message);
				await emit('test_run_completed', 'Tests finished', runId, sessionId, agentSlug, { id: tr.id });
			}
		}

		await this.runs.updateRun(runId, {
			status: 'completed',
			finalAnswer,
			updatedAt: isoNow(),
			completedAt: isoNow(),
		});

		const assistant: AgentMessage = {
			id: newId('msg'),
			sessionId,
			role: 'agent',
			content: finalAnswer,
			createdAt: isoNow(),
			status: 'done',
			metadata: { runId },
		};
		await this.sessions.addMessage(sessionId, assistant);
		await this.sessions.updateSessionStatus(sessionId, 'idle');
		await emit('run_completed', 'Run completed', runId, sessionId, agentSlug);
	}

	private async failRunStreaming(input: ExecuteMessageInput, runId: string, err: string): Promise<void> {
		await this.runs.updateRun(runId, {
			status: 'failed',
			error: err,
			updatedAt: isoNow(),
			completedAt: isoNow(),
		});
		const emit = this.makeEmit([]);
		await emit('run_failed', 'Run failed', runId, input.sessionId, input.agentSlug, { error: err });
		await this.sessions.updateSessionStatus(input.sessionId, 'failed');
		await this.logAudit(input, { sessionId: input.sessionId, runId, agentSlug: input.agentSlug, action: 'run_failed', details: { error: err } });
	}

	private wrapResponse(
		run: AgentRunFull,
		message: AgentMessage,
		artifacts: AgentArtifact[],
		events: AgentRuntimeEvent[],
		testResults: AgentSendResponsePayload['testResults'],
		browserPatch: AgentSendResponsePayload['browserPatch'],
		consoleLines: AgentSendResponsePayload['consoleLines'],
		suggestedChips?: string[],
	): AgentSendResponsePayload {
		return {
			run,
			message,
			artifacts,
			events,
			suggestedChips,
			testResults,
			browserPatch,
			consoleLines,
		};
	}

	private chips(mode: ExecuteMessageInput['mode'], agentSlug: string): string[] {
		const base =
			mode === 'ask'
				? ['Deepen plan', 'Show risks', 'Draft artifact']
				: mode === 'plan'
					? ['Milestone order', 'Rollback ideas', 'Test hooks']
					: ['Apply patch', 'Open PR sketch', 'Verify checklist'];
		if (agentSlug === 'testo') return [...base, 'Playwright outline'];
		return base;
	}

	private planToolsForMessage(
		agentSlug: string,
		mode: ExecuteMessageInput['mode'],
		message: string,
		sessionId: string,
	): PlannedToolCall[] {
		const m = message.toLowerCase();
		const raw: PlannedToolCall[] = [];
		const push = (toolId: string, input: Record<string, unknown> = {}) => {
			if (!this.toolRegistry.getTool(toolId)) return;
			if (!this.toolPerm.canUseTool(agentSlug, toolId)) return;
			raw.push({ toolId, input });
		};

		const qSnippet = message.slice(0, 240);
		const wantRepo = /\b(repo|repository|codebase|code base|angular|component|typescript|file|path|pr|pull request|commit)\b/i.test(
			message,
		);
		const wantJira = /\b(jira|ticket|bug|story|issue|regression)\b/i.test(message);
		const wantDocs = /\b(confluence|docs|documentation|onboarding|guide|wiki)\b/i.test(message);
		const wantSupport = /\b(support|customer|zendesk|servicenow|reply)\b/i.test(message);
		const wantCicd = /\b(pipeline|ci\b|\bcd\b|release|deploy|workflow|github actions)\b/i.test(message);

		if (agentSlug === 'fronto') {
			if (wantRepo || /\b(supplier|upload|ui)\b/i.test(message)) {
				push('connector_repo_search', { query: qSnippet || 'supplier upload' });
				push('connector_confluence_search', { query: qSnippet || 'supplier upload' });
			}
			if (/\b(api|endpoint|contract)\b/i.test(message)) {
				push('api_catalog_search', { query: qSnippet });
			}
			if (wantCicd) {
				push('connector_cicd_read_file', { path: '.github/workflows/ci.yml' });
			}
			if (
				/\b(inspect UI authenticated|authenticated dashboard|after login|dashboard UI)\b/i.test(message) ||
				(/\b(browser|login|inspect)\b/i.test(message) && /\b(authenticated|after login|dashboard)\b/i.test(message))
			) {
				push('browser_profile_list', {});
				push('browser_inspect_dom', {});
				push('browser_take_screenshot', {});
				push('artifact_create_checklist', {
					title: 'UI review checklist (authenticated)',
					content: '# UI review\n- [ ] Breakpoints\n- [ ] Focus order\n- [ ] Contrast\n',
				});
			} else if (/\b(browser|login|inspect|playwright)\b/i.test(message)) {
				push('browser_inspect_dom', {});
				push('artifact_create_checklist', {
					title: 'UI review checklist',
					content: '# UI review\n- [ ] Breakpoints\n- [ ] Focus order\n- [ ] Contrast\n',
				});
			}
			if (/\b(component|angular)\b/i.test(m)) {
				push('artifact_create_code', {
					title: 'Component draft',
					content: '// Angular component\n',
					language: 'typescript',
				});
			}
		}

		if (agentSlug === 'backo') {
			if (/\b(api|dto|endpoint|service|rest|graphql|supplier|upload)\b/i.test(message)) {
				push('api_catalog_search', { query: qSnippet });
				push('connector_repo_search', { query: qSnippet || 'supplier' });
				push('connector_jira_search', { query: qSnippet || 'supplier upload' });
			}
			if (/\b(database|schema|table|sql|migration|prisma)\b/i.test(message)) {
				push('db_schema_search', { query: qSnippet });
			}
		}

		if (agentSlug === 'testo') {
			if (wantJira || /\b(bug|regression|login|upload|supplier)\b/i.test(message)) {
				push('connector_jira_search', { query: qSnippet || 'supplier upload' });
				push('connector_repo_search', { query: qSnippet || 'upload' });
				push('test_generate_plan', {});
			}
			if (/\b(login|authenticated|save session|browser login|capture session)\b/i.test(m)) {
				push('browser_profile_list', {});
				if (/\b(demo|local)\b/i.test(m) && mode === 'act') {
					push('browser_create_demo_auth_profile', { profileName: 'Local demo' });
				} else if (mode === 'act') {
					push('browser_auth_capture_start', { sessionId, agentSlug });
				}
			}
			if (/\b(run smoke|test login|playwright|validate dashboard|dashboard smoke|login smoke)\b/i.test(m)) {
				push('browser_profile_list', {});
				push('playwright_generate_from_template', {
					templateKey: /\bdashboard\b/i.test(m) ? 'dashboard_smoke' : 'login_smoke',
				});
				if (mode === 'act') {
					push('playwright_run_template', {
						templateKey: /\bsupplier|upload\b/i.test(m)
							? 'supplier_upload_smoke'
							: /\bdashboard\b/i.test(m)
								? 'dashboard_smoke'
								: 'login_smoke',
					});
				}
			}
			if (/\bsupplier upload\b/i.test(m)) {
				push('playwright_generate_from_template', { templateKey: 'supplier_upload_smoke' });
			}
			if (/\bgenerate playwright|playwright tests\b/i.test(m)) {
				push('playwright_generate_spec', { title: 'generated.spec.ts', message: qSnippet });
				push('artifact_create_test', { title: 'Playwright notes', content: '# Tests\n' });
			}
			if (/\bplaywright\b/i.test(message)) push('test_generate_playwright', {});
			if (/\b(browser|playwright|e2e|inspect)\b/i.test(message)) {
				push('browser_open_url', { url: this.appConfig.browserDefaultUrl });
			}
			if (mode === 'act' && /\b(browser flow|flow check|e2e flow)\b/i.test(m)) {
				push('test_run_browser_flow', {});
			} else if (/\b(test|smoke)\b/i.test(m)) {
				push('test_run_smoke_mock', {});
			}
		}

		if (agentSlug === 'producto') {
			if (/\b(requirements|story|acceptance|criteria|ticket|supplier|upload)\b/i.test(message)) {
				push('connector_jira_search', { query: qSnippet || 'supplier upload' });
				push('connector_support_search', { query: qSnippet || 'upload' });
				push('connector_confluence_search', { query: qSnippet || 'supplier' });
				push('artifact_create_markdown', { title: 'User stories', content: '## Story\n- As a user…\n' });
			}
		}

		if (agentSlug === 'doco') {
			if (wantDocs || wantRepo) {
				push('connector_confluence_search', { query: qSnippet || 'supplier portal' });
				push('connector_repo_search', { query: qSnippet || 'supplier' });
				push('artifact_create_markdown', { title: 'Documentation', content: '# Update\n' });
			}
		}

		if (agentSlug === 'dato') {
			if (/\b(sql|report|dashboard|metric|upload|supplier)\b/i.test(message)) {
				push('db_schema_search', { query: qSnippet });
				push('connector_jira_search', { query: qSnippet || 'upload failure' });
				push('connector_confluence_search', { query: qSnippet || 'metrics' });
				push('artifact_create_sql', { title: 'report.sql', content: '-- draft\nSELECT 1;\n' });
			}
			if (/\bexecute query\b/i.test(m)) push('database_execute', {});
		}

		if (agentSlug === 'supporto') {
			if (wantSupport || /\b(customer|ticket|issue|reply|upload)\b/i.test(message)) {
				push('connector_support_search', { query: qSnippet || 'upload' });
				push('connector_confluence_search', { query: qSnippet || 'troubleshoot' });
				push('connector_jira_search', { query: qSnippet || 'supplier' });
				push('artifact_create_email', { title: 'Customer reply draft', content: 'Hello,\n\nThank you for contacting us.\n' });
			}
		}

		if (agentSlug === 'devopsy') {
			if (wantCicd || wantRepo) {
				push('connector_cicd_analyze', {});
				push('connector_repo_pull_requests', { repoSlug: 'bluemeteor-ai-force', state: 'OPEN' });
				push('connector_repo_commits', { repoSlug: 'bluemeteor-ai-force', branch: 'main' });
				push('artifact_create_checklist', { title: 'Release checklist', content: '- [ ] Verify CI\n- [ ] Smoke\n' });
			}
			if (/\b(deploy|production)\b/i.test(m)) push('deploy', {});
		}

		if (this.appConfig.enableMcpAdapter) {
			if (/\b(mcp|model context protocol|filesystem mcp|connected tools|external tools|list available tools)\b/i.test(message)) {
				push('mcp_list_servers', {});
				push('mcp_list_tools', {});
			}
		}

		if (/\b(component|angular|typescript)\b/i.test(m) && agentSlug !== 'fronto') push('code_generate', {});
		if (/\b(api|contract|rest)\b/i.test(m) && agentSlug !== 'backo') push('api_design', {});
		if (/\bsql|query|report\b/i.test(m) && agentSlug !== 'dato') push('sql_generate', {});
		if (/\bdocument|docs\b/i.test(m) && agentSlug !== 'doco') push('docs_generate', {});

		const seen = new Set<string>();
		const deduped: PlannedToolCall[] = [];
		for (const p of raw) {
			if (seen.has(p.toolId)) continue;
			seen.add(p.toolId);
			deduped.push(p);
		}
		let conn = 0;
		const out: PlannedToolCall[] = [];
		for (const p of deduped) {
			const isConn = p.toolId.startsWith('connector_');
			if (isConn && conn >= 3) continue;
			if (isConn) conn++;
			out.push(p);
		}
		return out.slice(0, 6);
	}

	private async runToolExecutionPhase(
		sessionId: string,
		runId: string,
		agentSlug: string,
		mode: ExecuteMessageInput['mode'],
		actorUserId: string | undefined,
		planned: PlannedToolCall[],
		emit: ReturnType<AgentOrchestratorService['makeEmit']>,
	): Promise<{
		stoppedForApproval: boolean;
		approvalId?: string;
		toolContextBlock?: string;
		testResults: AgentSendResponsePayload['testResults'];
		browserPatch: AgentSendResponsePayload['browserPatch'];
	}> {
		const lines: string[] = [];
		const domParts: string[] = [];
		let browserPatch: AgentSendResponsePayload['browserPatch'] = null;
		let testResults: AgentSendResponsePayload['testResults'] = null;

		for (const p of planned) {
			const res = await this.toolExec.execute({
				runId,
				sessionId,
				agentSlug,
				mode,
				toolId: p.toolId,
				input: p.input,
				actorUserId,
			});
			if (res.status === 'requires_approval') {
				return {
					stoppedForApproval: true,
					approvalId: res.approvalId,
					testResults,
					browserPatch,
				};
			}
			lines.push(this.summarizeToolResult(p.toolId, res));
			const snap = this.extractSnapshot(res);
			if (snap) {
				if (typeof snap['domSummary'] === 'string' && snap['domSummary'].length) {
					domParts.push(String(snap['domSummary']).slice(0, 8000));
				} else if (typeof snap['textContent'] === 'string') {
					domParts.push(String(snap['textContent']).slice(0, 4000));
				}
				if (typeof snap['url'] === 'string') {
					browserPatch = {
						isOpen: true,
						currentUrl: snap['url'] as string,
						title: typeof snap['title'] === 'string' ? (snap['title'] as string) : 'Page',
						loading: false,
					};
				}
			}
			if (p.toolId.startsWith('test_run') && res.status === 'completed') {
				testResults = this.mapTestToolResults(runId, res);
			}
		}

		const toolContextBlock = this.composeToolContextBlock(lines, domParts);
		return {
			stoppedForApproval: false,
			toolContextBlock,
			testResults,
			browserPatch,
		};
	}

	private extractSnapshot(res: ToolExecutionResult): Record<string, unknown> | null {
		const o = res.output;
		if (!o || typeof o !== 'object') return null;
		const snap = (o as Record<string, unknown>)['snapshot'];
		return snap && typeof snap === 'object' ? (snap as Record<string, unknown>) : null;
	}

	private summarizeToolResult(toolId: string, res: ToolExecutionResult): string {
		const st = res.status;
		if (st === 'blocked' || st === 'failed') return `- ${toolId}: ${st}${res.error ? ` (${res.error})` : ''}`;
		if (st === 'completed') {
			const o = res.output;
			if (o && typeof o === 'object') {
				const rec = o as Record<string, unknown>;
				const sum = typeof rec['summary'] === 'string' ? (rec['summary'] as string) : '';
				const title = typeof rec['title'] === 'string' ? (rec['title'] as string) : '';
				const meta = rec['metadata'];
				const recMeta = meta && typeof meta === 'object' ? (meta as Record<string, unknown>) : undefined;
				const src =
					typeof recMeta?.['source'] === 'string'
						? String(recMeta['source'])
						: '';
				const csrc = typeof recMeta?.['connectorSource'] === 'string' ? String(recMeta['connectorSource']) : '';
				const tag = csrc ? `connector:${csrc}` : src ? src : '';
				if (sum || title) {
					const bits = [title, sum].filter(Boolean).join(' — ');
					return `- ${toolId}${tag ? ` [${tag}]` : ''}: ${bits.slice(0, 400)}`;
				}
			}
			const keys = res.output ? Object.keys(res.output).join(', ') : '';
			return `- ${toolId}: ok${keys ? ` [${keys}]` : ''}`;
		}
		return `- ${toolId}: ${st}`;
	}

	private composeToolContextBlock(lines: string[], domParts: string[]): string | undefined {
		const blocks: string[] = [];
		if (lines.length) blocks.push(lines.join('\n'));
		if (domParts.length) blocks.push('DOM / page summary:\n' + domParts.join('\n---\n').slice(0, 12000));
		const text = blocks.join('\n\n').trim();
		return text.length ? text : undefined;
	}

	private mapTestToolResults(runId: string, res: ToolExecutionResult): AgentSendResponsePayload['testResults'] {
		if (res.status !== 'completed') return null;
		const out = res.output ?? {};
		const passed = typeof out['passed'] === 'number' ? (out['passed'] as number) : undefined;
		const failed = typeof out['failed'] === 'number' ? (out['failed'] as number) : undefined;
		return [
			{
				id: newId('tr'),
				title: `Tests (${runId.slice(0, 8)})`,
				status: failed && failed > 0 ? 'failed' : 'passed',
				durationMs: 0,
				error: typeof out['error'] === 'string' ? out['error'] : undefined,
			},
			...(passed !== undefined || failed !== undefined
				? [
						{
							id: newId('tr'),
							title: `Passed/failed: ${passed ?? '?'}/${failed ?? '?'}`,
							status: 'passed' as const,
							durationMs: 0,
						},
					]
				: []),
		];
	}

	private async logAudit(
		actorCtx: Pick<ExecuteMessageInput, 'actorUserId' | 'actorEmail'> | undefined,
		entry: {
			sessionId?: string;
			runId?: string;
			agentSlug?: string;
			action: string;
			details?: Record<string, unknown>;
		},
	): Promise<void> {
		if (!this.appConfig.enableAuditLogs) return;
		await this.audit.record({
			actorUserId: actorCtx?.actorUserId,
			actorEmail: actorCtx?.actorEmail,
			sessionId: entry.sessionId ?? null,
			runId: entry.runId,
			agentSlug: entry.agentSlug ?? 'unknown',
			action: entry.action,
			details: entry.details,
		});
	}
}
