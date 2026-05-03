import {
	Body,
	Controller,
	ForbiddenException,
	Get,
	NotFoundException,
	Param,
	Post,
	Query,
	Sse,
	UnauthorizedException,
	UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { from, type Observable } from 'rxjs';
import { finalize, map, mergeMap } from 'rxjs/operators';

import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { SubmitApprovalDto } from './dto/submit-approval.dto';
import type { InternalAgentConfig } from './models/internal-agent-config.model';
import { AgentApprovalService } from './services/agent-approval.service';
import { AgentArtifactService } from './services/agent-artifact.service';
import { AgentAuditLogService } from './services/agent-audit-log.service';
import { AgentConfigRegistryService } from './services/agent-config-registry.service';
import { AgentEventBusService } from './services/agent-event-bus.service';
import type { AgentSendResponsePayload, StreamStartPayload } from './services/agent-orchestrator.service';
import { AgentOrchestratorService } from './services/agent-orchestrator.service';
import { AgentStreamTokenService } from './services/agent-stream-token.service';
import { AgentRuntimeHealthService } from './services/agent-runtime-health.service';
import { AgentRunService } from './services/agent-run.service';
import { AgentSessionService } from './services/agent-session.service';
import { BrowserSessionService } from '../browser/services/browser-session.service';
import { BrowserSnapshotRepository } from '../browser/repositories/browser-snapshot.repository';
import { ToolExecutorService } from '../tools/services/tool-executor.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RequireAgentAccess } from '../auth/decorators/require-agent-access.decorator';
import {
	RequireRunAccess,
	RequireSessionAccess,
} from '../auth/decorators/require-session-access.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AgentAccessGuard } from '../auth/guards/agent-access.guard';
import { SessionAccessGuard } from '../auth/guards/session-access.guard';
import type { AuthUser } from '../auth/models/auth-user.model';
import { RbacService } from '../auth/services/rbac.service';
import { isoNow } from '../common/utils/dates';
import { newId } from '../common/utils/ids';
import { RuntimeMetricsService } from '../observability/services/runtime-metrics.service';

/** Nest SSE adapter expects message-like events with a `data` string. */
interface SseDataEvent {
	readonly data: string;
}

/** Client response for stream-start (includes signed SSE URL). */
export interface AgentStreamStartResponseDto extends StreamStartPayload {
	readonly streamUrl: string;
	readonly streamTokenExpiresAt: string;
}

@Controller('agents')
export class AgentsController {
	constructor(
		private readonly sessions: AgentSessionService,
		private readonly runs: AgentRunService,
		private readonly orchestrator: AgentOrchestratorService,
		private readonly artifacts: AgentArtifactService,
		private readonly registry: AgentConfigRegistryService,
		private readonly approvals: AgentApprovalService,
		private readonly events: AgentEventBusService,
		private readonly audit: AgentAuditLogService,
		private readonly runtimeHealth: AgentRuntimeHealthService,
		private readonly browserSessions: BrowserSessionService,
		private readonly browserSnapshots: BrowserSnapshotRepository,
		private readonly toolExecutor: ToolExecutorService,
		private readonly rbac: RbacService,
		private readonly streamTokens: AgentStreamTokenService,
		private readonly runtimeMetrics: RuntimeMetricsService,
	) {}

	@Get('runtime/health')
	async getRuntimeHealth(): Promise<Record<string, unknown>> {
		return this.runtimeHealth.getSnapshot();
	}

	@Get('configs')
	listConfigs(): InternalAgentConfig[] {
		return this.registry.getAllConfigs();
	}

	@Get('configs/:agentSlug')
	getConfig(@Param('agentSlug') agentSlug: string): InternalAgentConfig {
		const c = this.registry.getConfig(agentSlug);
		if (!c) throw new NotFoundException(`Unknown agent ${agentSlug}`);
		return c;
	}

	@Get('readiness')
	@RequirePermissions('agents.readiness.view')
	readiness(): ReturnType<AgentConfigRegistryService['getPriorityReadinessSummary']> {
		return this.registry.getPriorityReadinessSummary();
	}

	@Get('runs/:runId')
	@UseGuards(SessionAccessGuard)
	@RequireRunAccess('view')
	@RequirePermissions('agents.view')
	async getRun(@Param('runId') runId: string) {
		return this.runs.getRun(runId);
	}

	@Get('sessions/:sessionId')
	@UseGuards(SessionAccessGuard)
	@RequireSessionAccess('view')
	@RequirePermissions('agents.view')
	async getSession(@Param('sessionId') sessionId: string) {
		return this.sessions.getSession(sessionId);
	}

	@Get('sessions/:sessionId/browser')
	@UseGuards(SessionAccessGuard)
	@RequireSessionAccess('view')
	@RequirePermissions('browser.view')
	async browserWorkspace(@Param('sessionId') sessionId: string) {
		const sessions = await this.browserSessions.listBrowserSessions(sessionId);
		const snapshots = (
			await Promise.all(
				sessions.map((s) => this.browserSnapshots.listByBrowserSessionId(s.id)),
			)
		).flat();
		return { sessions, snapshots };
	}

	@Get('sessions/:sessionId/messages')
	@UseGuards(SessionAccessGuard)
	@RequireSessionAccess('view')
	@RequirePermissions('agents.view')
	async listMessages(@Param('sessionId') sessionId: string) {
		return this.sessions.listMessages(sessionId);
	}

	@Post('sessions/:sessionId/messages')
	@Throttle({ agent: { limit: 20, ttl: 60_000 } })
	@UseGuards(SessionAccessGuard, AgentAccessGuard)
	@RequireSessionAccess('use')
	@RequirePermissions('agents.use')
	@RequireAgentAccess('use')
	async sendMessage(
		@CurrentUser() user: AuthUser,
		@Param('sessionId') sessionId: string,
		@Body() dto: SendMessageDto,
	): Promise<AgentSendResponsePayload> {
		if (dto.mode === 'act' && !this.rbac.canAccessAgent(user, dto.agentSlug, 'act')) {
			throw new ForbiddenException('Act mode not permitted for this agent');
		}
		await this.audit.record({
			actorUserId: user.id,
			actorEmail: user.email,
			sessionId,
			agentSlug: dto.agentSlug,
			action: 'message_received',
			details: { mode: dto.mode },
		});
		return this.orchestrator.executeMessage({
			sessionId,
			agentSlug: dto.agentSlug,
			mode: dto.mode,
			message: dto.message,
			context: dto.context,
			actorUserId: user.id,
			actorEmail: user.email,
			actorRoles: user.roles,
		});
	}

	@Post('sessions/:sessionId/messages/stream-start')
	@Throttle({ agent: { limit: 20, ttl: 60_000 } })
	@UseGuards(SessionAccessGuard, AgentAccessGuard)
	@RequireSessionAccess('use')
	@RequirePermissions('agents.use')
	@RequireAgentAccess('use')
	async startMessageStream(
		@CurrentUser() user: AuthUser,
		@Param('sessionId') sessionId: string,
		@Body() dto: SendMessageDto,
	): Promise<AgentStreamStartResponseDto> {
		if (dto.mode === 'act' && !this.rbac.canAccessAgent(user, dto.agentSlug, 'act')) {
			throw new ForbiddenException('Act mode not permitted for this agent');
		}
		await this.audit.record({
			actorUserId: user.id,
			actorEmail: user.email,
			sessionId,
			agentSlug: dto.agentSlug,
			action: 'stream_start_requested',
			details: { mode: dto.mode },
		});
		const start = await this.orchestrator.startStreamingMessage({
			sessionId,
			agentSlug: dto.agentSlug,
			mode: dto.mode,
			message: dto.message,
			context: dto.context,
			actorUserId: user.id,
			actorEmail: user.email,
			actorRoles: user.roles,
		});
		const { token, expiresAt } = await this.streamTokens.createStreamToken({
			userId: user.id,
			sessionId,
			runId: start.runId,
			agentSlug: dto.agentSlug,
		});
		const streamUrl = `/agents/sessions/${encodeURIComponent(sessionId)}/runs/${encodeURIComponent(start.runId)}/events?streamToken=${encodeURIComponent(token)}`;
		return {
			...start,
			streamUrl,
			streamTokenExpiresAt: expiresAt,
		};
	}

	@Public()
	@Sse('sessions/:sessionId/runs/:runId/events')
	@Throttle({ stream: { limit: 120, ttl: 60_000 } })
	streamRunEvents(
		@Param('sessionId') sessionId: string,
		@Param('runId') runId: string,
		@Query('streamToken') streamToken: string | undefined,
	): Observable<SseDataEvent> {
		return from(
			(async (): Promise<Observable<SseDataEvent>> => {
				const claims = await this.streamTokens.verifyStreamToken(streamToken);
				await this.streamTokens.assertTokenMatchesRun(claims, sessionId, runId);
				const user = await this.rbac.loadAuthUser(claims.userId);
				if (!user) throw new UnauthorizedException();
				if (!this.rbac.canAccessAgent(user, claims.agentSlug, 'use')) {
					throw new ForbiddenException('Agent access denied');
				}
				const run = await this.runs.getRun(runId);
				if (run.sessionId !== sessionId) {
					throw new NotFoundException('Run not found for session');
				}
				this.runtimeMetrics.recordSseOpen();
				return this.events.sseForRun(runId).pipe(
					map((e) => ({ data: JSON.stringify(e) })),
					finalize(() => this.runtimeMetrics.recordSseClose()),
				);
			})(),
		).pipe(mergeMap((obs) => obs));
	}

	@Post('sessions/:sessionId/runs/:runId/approvals/:approvalId')
	@UseGuards(SessionAccessGuard)
	@RequireSessionAccess('use')
	@RequirePermissions('tools.approve')
	async submitApproval(
		@CurrentUser() user: AuthUser,
		@Param('sessionId') sessionId: string,
		@Param('runId') runId: string,
		@Param('approvalId') approvalId: string,
		@Body() dto: SubmitApprovalDto,
	): Promise<{ ok: boolean }> {
		const decision = dto.decision === 'approved' ? 'approved' : 'rejected';
		await this.approvals.submitDecision(runId, approvalId, decision, user);
		const run = await this.runs.getRun(runId);
		await this.events.emit({
			id: newId('evt'),
			runId,
			sessionId,
			agentSlug: run.agentSlug,
			type: 'approval_resolved',
			title: 'Approval resolved',
			message: decision,
			timestamp: isoNow(),
			payload: { approvalId, decision },
		});
		await this.audit.record({
			actorUserId: user.id,
			actorEmail: user.email,
			sessionId,
			runId,
			agentSlug: run.agentSlug,
			action: 'approval_resolved',
			details: { approvalId, decision },
		});
		await this.toolExecutor.resumeByApproval(approvalId, decision);
		return { ok: true };
	}

	@Get('sessions/:sessionId/artifacts')
	@UseGuards(SessionAccessGuard)
	@RequireSessionAccess('view')
	@RequirePermissions('agents.view')
	async listArtifacts(@Param('sessionId') sessionId: string) {
		return this.artifacts.listArtifacts(sessionId);
	}

	@Get('sessions/:sessionId/activity')
	@UseGuards(SessionAccessGuard)
	@RequireSessionAccess('view')
	@RequirePermissions('agents.view')
	async activity(@Param('sessionId') sessionId: string) {
		return this.events.listEvents(sessionId);
	}

	@Post(':agentSlug/sessions')
	@RequirePermissions('agents.use')
	@UseGuards(AgentAccessGuard)
	@RequireAgentAccess('use')
	async createSession(
		@CurrentUser() user: AuthUser,
		@Param('agentSlug') agentSlug: string,
		@Body() dto: CreateSessionDto,
	) {
		const s = await this.sessions.createSession(agentSlug, dto.mode);
		await this.audit.record({
			actorUserId: user.id,
			actorEmail: user.email,
			sessionId: s.id,
			agentSlug,
			action: 'session_created',
			details: { mode: dto.mode },
		});
		return s;
	}

	@Get(':agentSlug/sessions')
	@RequirePermissions('agents.view')
	@UseGuards(AgentAccessGuard)
	@RequireAgentAccess('view')
	async listAgentSessions(@Param('agentSlug') agentSlug: string) {
		return this.sessions.listSessions(agentSlug);
	}
}
